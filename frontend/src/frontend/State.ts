import { io } from "socket.io-client"
import { markRaw, reactive } from "vue"
import { unreachable } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { EventListener } from "../eventLib/EventListener"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { StructSyncAxios } from "../structSyncAxios/StructSyncAxios"
import { AuthBridge } from "./auth/AuthBridge"
import { DeviceProxy } from "./device/DeviceProxy"
import { PersonalTerminalSpawnerProxy } from "./terminal/PersonalTerminalSpawnerProxy"

class State extends EventListener {
    public readonly context
    public readonly auth!: AuthBridge
    public readonly device!: DeviceProxy
    public readonly terminalSpawner!: PersonalTerminalSpawnerProxy
    public authReady = false
    public connected = false
    public connectionContext: DIContext | null = null

    public awake() {
        const context = new DIContext(this.context)
        context.provide(MessageBridge, () => new StructSyncAxios("/api"))
        const client = context.provide(StructSyncClient, "default")

        const auth = context.instantiate(() => new AuthBridge(
            localStorage.getItem("smwa:token"),
            localStorage.getItem("smwa:refresh-token")
        ))

        client.use(auth.middleware)

        auth.init().then(() => {
            this.authReady = true
        })

        auth.onTokenChange.add(this, () => {
            if (auth.token != null) localStorage.setItem("smwa:token", auth.token); else localStorage.removeItem("smwa:token")
            if (auth.refreshToken != null) localStorage.setItem("smwa:refresh-token", auth.refreshToken); else localStorage.removeItem("smwa:refresh-token")
        })

        auth.onUserChange.add(this, () => {
            if (auth.user) {
                this.init()
            } else {
                this.connectionContext?.dispose()
                this.connectionContext = null
            }
        })

        Object.assign(this, { context, auth })
    }

    public init() {
        if (this.connectionContext) unreachable()

        const socket = markRaw(io({
            auth: {
                token: this.auth.token
            }
        }))

        socket.on("connect", () => {
            this.connected = true
        })

        socket.on("disconnect", (reason) => {
            this.connected = false
        })

        const context = new DIContext(this.context)
        context.guard(() => socket.disconnect())

        const bridge = context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        bridge.hideErrorDetail = false
        context.provide(StructSyncClient, "default")

        const device = context.instantiate(() => DeviceProxy.default())
        const terminalSpawner = context.instantiate(() => PersonalTerminalSpawnerProxy.default())
        context.guard(device)

        Object.assign(this, { device, connectionContext: context, terminalSpawner })

        this.device.synchronize()
    }

    constructor() {
        super()
        this.context = new DIContext()
        this.context.provide(IDProvider, () => new IDProvider.Incremental())
        const self = reactive(this) as State
        self.awake()

        return self
    }
}

export const STATE = new State() as State
// @ts-ignore
window.state = STATE

window.addEventListener("beforeunload", () => {
    STATE.connectionContext?.dispose()
})