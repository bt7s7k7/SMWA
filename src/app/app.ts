import { createServer } from "http"
import { hostname } from "os"
import { join } from "path"
import { Server } from "socket.io"
import { AccessTokenListController } from "../backend/AccessTokenListController"
import { AuthController } from "../backend/AuthController"
import { DATABASE, SavedKeys } from "../backend/DATABASE"
import { DeviceController } from "../backend/DeviceController"
import { ENV } from "../backend/ENV"
import { FileBrowserController } from "../backend/FileBrowserController"
import { ROOT_ROUTER } from "../backend/network"
import { ServiceManager } from "../backend/service/ServiceManager"
import { ServiceRepository, stringifyServiceLoadFailure } from "../backend/service/ServiceRepository"
import { PersonalTerminalSpawnerController } from "../backend/terminal/PersonalTerminalSpawnerController"
import { TerminalHandleController } from "../backend/terminal/TerminalHandleController"
import { TerminalManager } from "../backend/terminal/TerminalManager"
import { DeviceConfig } from "../common/Device"
import { User } from "../common/User"
import { Readwrite } from "../comTypes/types"
import { stringifyAddress, wrapFunction } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import { PermissionRepository } from "../simpleAuth/PermissionRepository"
import { SerializationError, Type } from "../struct/Type"
import { ClientError, StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import { StructSyncExpress } from "../structSyncExpress/StructSyncExpress"
import { VirtualModemServer } from "../virtualNetworkModem/VirtualModem"
import busboy = require("connect-busboy")
import express = require("express")
import AdmZip = require("adm-zip")

const context = new DIContext()
context.provide(IDProvider, () => new IDProvider.Incremental())
const logger = context.provide(Logger, () => new NodeLogger())
const eventLogTerminal = TerminalHandleController.make({ virtual: true, command: process.argv.join(" "), id: "__event_log" })
logger.write = wrapFunction(logger.write, (base) => (...args) => {
    const message = args[0]
    eventLogTerminal.write(message)
    base(...args)
})

logger.info`Config: ${ENV}`

logger.info`Starting...`

const app = express()
const http = createServer(app)
const io = new Server(http)

if (!DATABASE.tryGet("device")) {
    DATABASE.put("device", new DeviceConfig({
        label: hostname()
    }))
}

const ioSessions = new WeakSet<StructSyncSession>()

const accessTokenList = AccessTokenListController.make()

context.provide(TerminalManager, "default")
const deviceController = context.instantiate(() => DeviceController.make(DATABASE.get("device")))
const serviceManager = context.instantiate(() => new ServiceManager(deviceController))
serviceManager.init()

const { auth } = (() => {
    const apiContext = new DIContext(context)

    const bridge = apiContext.provide(MessageBridge, () => new StructSyncExpress())
    app.use("/api", express.json(), bridge.handler)

    const server = apiContext.provide(StructSyncServer, "default")

    const auth = apiContext.instantiate(() => new AuthController({
        findUser(username) {
            const user = DATABASE.tryGet("user", username)
            if (user) return { user, salt: user.salt }
            else return null
        },
        registerUser(username, password, salt) {
            const user = new User({ id: username, password, salt })
            DATABASE.put("user", user)
            return user
        },
        sanitizeUser: user => new User({ ...user, salt: "", password: "" }),
        testUser: (user, password) => user.salt != "" && user.password == password,
        changeUserPassword: (user, passwordHashFactory) => {
            if (user.id == "ServiceAccount") throw new ClientError("Cannot change password of ServiceAccount")
            user.password = passwordHashFactory(user.salt)
            DATABASE.setDirty()
        },
        listUsers: () => [...DATABASE.list("user")],
        deleteUser: (user) => {
            if (user.id == "ServiceAccount") throw new ClientError("Cannot delete ServiceAccount")
            DATABASE.delete("user", user.id)
        },
        permissions: new PermissionRepository(AuthController, [
            [AuthController.PERMISSIONS.REGISTER, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.CHANGE_OWN_PASSWORD, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.CHANGE_PASSWORD, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.DELETE_OWN_ACCOUNT, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.DELETE_ACCOUNT, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.LIST_USERS, (meta) => ioSessions.has(meta.session)]
        ]),
        additionalTokenResolver: (token) => accessTokenList.testToken(token) ? DATABASE.get("user", "ServiceAccount") : null
    }).register())

    const keys = DATABASE.tryGet("savedKeys")
    if (keys) {
        auth.key = Buffer.from(keys.key, "base64")
        auth.refreshKey = Buffer.from(keys.refreshKey, "base64")
    } else {
        DATABASE.put("savedKeys", new SavedKeys({
            key: auth.key.toString("base64"),
            refreshKey: auth.refreshKey.toString("base64")
        }))
    }

    server.use(auth.middleware)
    apiContext.instantiate(() => deviceController.register())
    apiContext.instantiate(() => serviceManager.connect())

    return { auth }
})()

if (DATABASE.getAll("user").size == 0) {
    logger.warn`No users found, creating default account admin:admin`
    auth.createAccount("admin", "admin")
}

if (!DATABASE.tryGet("user", "ServiceAccount")) {
    logger.warn`Restoring service account`
    DATABASE.put("user", new User({ id: "ServiceAccount", password: "", salt: "" }))

}

app.use("/upload", busboy())
app.post("/upload", async (req, res) => {
    try {
        if (!req.busboy) {
            res.status(405).end("Unsupported media type")
            return
        }

        const authorization = req.headers.authorization
        if (!authorization) {
            res.status(401).end("Authorization required")
            return
        }
        if (!authorization.startsWith("Bearer ")) {
            res.status(400).end("Invalid authorization format")
            return
        }

        const token = authorization.substring(7)
        const user = await auth.resolveToken(token)
        if (!user) {
            res.status(403).end("Invalid token")
            return
        }
        const { service } = Type.object({ service: Type.string }).deserialize(req.query)
        const serviceController = serviceManager.services.get(service)
        if (!serviceController) {
            res.status(404).end("Service does not exist")
            return
        }

        req.busboy.on("file", (field, stream, name) => {
            if (field == "file") {
                const chunks: Buffer[] = []
                stream.on("data", (chunk) => chunks.push(chunk))
                stream.on("end", async () => {
                    try {
                        const zipData = Buffer.concat(chunks)
                        const zip = new AdmZip(zipData)
                        const error = await ServiceRepository.applyServiceDeployment(serviceController, zip)

                        if (error) {
                            res.status(404).end(stringifyServiceLoadFailure(error, serviceController.config))
                        } else {
                            res.status(200).end()
                        }
                    } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error(err)
                        res.status(500).end("Internal server error")
                    }
                })
            }
        })

        req.pipe(req.busboy)

    } catch (err) {
        if (err instanceof SerializationError) {
            res.status(404).end(err.message)
            return
        }

        // eslint-disable-next-line no-console
        console.error(err)
        res.status(500).end("Internal server error")
    }
})

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    const user = await auth.verifyToken(token, "key")

    if (user) {
        next()
    } else {
        next(new Error("Invalid auth"))
    }
})

{
    const ioContext = new DIContext(context)
    ioContext.provide(StructSyncServer, "default")

    const personalTerminalSpawner = ioContext.instantiate(() => new PersonalTerminalSpawnerController().register())
    ioContext.instantiate(() => deviceController.register())
    ioContext.instantiate(() => serviceManager.connect())
    ioContext.instantiate(() => FileBrowserController.make().register())
    ioContext.instantiate(() => auth.register())
    ioContext.instantiate(() => eventLogTerminal.register())
    ioContext.instantiate(() => accessTokenList.register());

    (serviceManager.terminalManager as Readwrite<TerminalManager>).context = ioContext

    io.on("connect", socket => {
        const sessionContext = new DIContext(ioContext)
        sessionContext.provide(MessageBridge, () => new MessageBridge.Generic(socket))

        const session = sessionContext.provide(StructSyncSession, "default")
        ioSessions.add(session)

        const modem = sessionContext.instantiate(() => new VirtualModemServer(ROOT_ROUTER.connect()))
        sessionContext.guard(modem)

        session.onError.add(null, (error) => logger.error`${error}`)

        sessionContext.guard(personalTerminalSpawner.createFinalizer(session))
        sessionContext.guard(() => ioSessions.delete(session))

        socket.on("disconnect", () => {
            sessionContext.dispose()
        })
    })
}

const distFolder = join(ENV.BASE_DIR, "frontend/dist")
app.use("/", express.static(distFolder))
app.use("/", (req, res) => res.status(200).sendFile(join(distFolder, "index.html")))

http.listen(ENV.PORT, () => {
    logger.info`Listening on ${"http://" + stringifyAddress(http.address())}`
})
