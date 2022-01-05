import { createServer } from "http"
import { hostname } from "os"
import { join } from "path"
import { Server } from "socket.io"
import { AuthController } from "../backend/AuthController"
import { DATABASE } from "../backend/DATABASE"
import { DeviceController } from "../backend/DeviceController"
import { ENV } from "../backend/ENV"
import { FileBrowserController } from "../backend/FileBrowserController"
import { ServiceManager } from "../backend/service/ServiceManager"
import { PersonalTerminalSpawnerController } from "../backend/terminal/PersonalTerminalSpawnerController"
import { TerminalManager } from "../backend/terminal/TerminalManager"
import { DeviceConfig } from "../common/Device"
import { User } from "../common/User"
import { stringifyAddress } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import { PermissionRepository } from "../simpleAuth/PermissionRepository"
import { StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import { StructSyncExpress } from "../structSyncExpress/StructSyncExpress"
import express = require("express")

const context = new DIContext()
context.provide(IDProvider, () => new IDProvider.Incremental())
const logger = context.provide(Logger, () => new NodeLogger())

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

const auth = (() => {
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
        testUser: (user, password) => user.password == password,
        changeUserPassword: (user, passwordHashFactory) => {
            user.password = passwordHashFactory(user.salt)
            DATABASE.setDirty()
        },
        listUsers: () => [...DATABASE.list("user")],
        deleteUser: (user) => {
            DATABASE.delete("user", user.id)
        },
        permissions: new PermissionRepository(AuthController, [
            [AuthController.PERMISSIONS.REGISTER, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.CHANGE_OWN_PASSWORD, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.CHANGE_PASSWORD, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.DELETE_OWN_ACCOUNT, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.DELETE_ACCOUNT, (meta) => ioSessions.has(meta.session)],
            [AuthController.PERMISSIONS.LIST_USERS, (meta) => ioSessions.has(meta.session)]
        ])
    }).register())

    server.use(auth.middleware)

    return auth
})()

if (DATABASE.getAll("user").size == 0) {
    logger.warn`No users found, creating default account admin:admin`
    auth.createAccount("admin", "admin")
}

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

    ioContext.provide(TerminalManager, "default")
    const personalTerminalSpawner = ioContext.instantiate(() => new PersonalTerminalSpawnerController().register())
    const deviceController = ioContext.instantiate(() => DeviceController.make(DATABASE.get("device")).register())
    ioContext.instantiate(() => new ServiceManager(deviceController).register()).init()
    ioContext.instantiate(() => FileBrowserController.make().register())
    ioContext.instantiate(() => auth.register())

    io.on("connect", socket => {
        const sessionContext = new DIContext(ioContext)
        sessionContext.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        const session = sessionContext.provide(StructSyncSession, "default")
        ioSessions.add(session)

        session.onError.add(null, (error) => logger.error`${error}`)

        sessionContext.guard(personalTerminalSpawner.createFinalizer(session))
        sessionContext.guard(() => ioSessions.delete(session))

        socket.on("disconnect", () => {
            sessionContext.dispose()
        })
    })
}

app.use("/", express.static(join(__dirname, "../../frontend/dist")))

http.listen(ENV.PORT, () => {
    logger.info`Listening on ${"http://" + stringifyAddress(http.address())}`
})
