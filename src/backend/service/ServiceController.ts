import { randomBytes } from "crypto"
import { URL } from "url"
import { ADMIN_GUI_SOCKET_VARIABLE } from "../../adminUICommon/const"
import { unreachable } from "../../comTypes/util"
import { ServiceConfig, ServiceContract, ServiceDefinition, ServiceInfo } from "../../common/Service"
import { DIContext } from "../../dependencyInjection/DIContext"
import { DISPOSE } from "../../eventLib/Disposable"
import { EventEmitter } from "../../eventLib/EventEmitter"
import { ClientError } from "../../structSync/StructSyncServer"
import { DATABASE } from "../DATABASE"
import { DeviceController } from "../DeviceController"
import { ADMIN_UI_BRIDGE } from "../network"
import { TerminalManager } from "../terminal/TerminalManager"
import { ServiceRepository, stringifyServiceLoadFailure } from "./ServiceRepository"

export class ServiceController extends ServiceContract.defineController() {
    public readonly onInfoChanged = new EventEmitter()
    public terminalManager: TerminalManager = null!
    public device: DeviceController = null!
    public authKey: Buffer | null = null

    protected readonly _device = DIContext.current.inject(DeviceController)

    public [DISPOSE]() {
        super[DISPOSE]()
        if (this.terminal) {
            this.terminalManager.deleteTerminal(this.terminal)
        }
    }

    public impl = super.impl({
        setLabel: async ({ label }) => {
            this.mutate(v => v.config.label = label)
            DATABASE.setDirty()
            this.onInfoChanged.emit()
        },
        start: async () => {
            if (this.definition == null) throw new ClientError("Cannot start a failed service")
            if (this.state == "running" || this.state == "updating") throw new ClientError("Cannot start service in current state")
            await this.start()
        },
        stop: async () => {
            if (this.definition == null) throw new ClientError("Cannot stop a failed service")
            if (this.state != "running" && this.state != "updating") throw new ClientError("Cannot stop service in current state")
            await this.stop()
        },
        update: async () => {
            if (this.definition == null) throw new ClientError("Cannot update a failed service")
            if (this.state == "running") throw new ClientError("Cannot update service in current state")
            if (!this.definition.scripts?.update) throw new ClientError("Service does not have an update script")
            await this.update()
        },
        setScheduler: async ({ scheduler }) => {
            this.mutate(v => v.config.scheduler = scheduler)
            DATABASE.setDirty()
        },
        reloadDefinition: async () => {
            await this.stop(!!"ignore errors")

            const error = await ServiceRepository.reloadServiceDefinition(this)
            if (error) {
                const errorMessage = stringifyServiceLoadFailure(error, this.config)
                this.mutate(v => v.error = errorMessage)
            } else {
                this.mutate(v => v.error = null)
            }

            this.onInfoChanged.emit()
        },
        setEnvVariable: async ({ key, replace, value }) => {
            if (value == null && replace == null) {
                if (!this.config.env.has(key)) throw new ClientError("Variable not found")
                this.mutate(v => v.config.env.delete(key))
            } else if (value != null && replace == null) {
                this.mutate(v => v.config.env.set(key, value))
            } else if (value == null && replace != null) {
                if (!this.config.env.has(replace)) throw new ClientError("Variable not found")
                if (key in this.config.env) throw new ClientError("Variable already exists")
                this.mutate(v => {
                    v.config.env.set(key, this.config.env.get(replace)!)
                    v.config.env.delete(replace)
                })
            } else {
                throw new ClientError("Invalid signature")
            }

            DATABASE.setDirty()
        },
        setAuthEnabled: async ({ enabled }) => {
            if (enabled == false) {
                this.mutate(v => v.config.authEnabled = false)
            } else {
                if (this.definition?.authSupport == false) throw new ClientError("This service does not support auth")
                if (this.device.config.authURL == null) throw new ClientError("Auth URL is not set")
                this.mutate(v => v.config.authEnabled = true)

                if (this.state == "running") {
                    const terminal = this.terminalManager.terminals.get(this.terminal!)!
                    terminal.writeMessage("Restart required to enable auth")
                }
            }

            DATABASE.setDirty()
        }
    })

    public async start() {
        if (this.definition == null) throw new Error("Cannot start a failed service")
        if (this.state == "running" || this.state == "updating") throw new Error("Cannot start service in current state")
        if (!this.definition.scripts?.start) throw new Error("Service does not have a start script")
        if (this.terminal) {
            this.terminalManager.deleteTerminal(this.terminal)
        }

        await this.openTerminal(this.definition.scripts?.start, "running")
    }

    public async stop(ignoreError?: boolean) {
        if (this.state == "stopped" || this.state == "error") {
            if (!ignoreError) throw new Error("Cannot stop service in current state")
            else return
        }
        if (!this.terminal) unreachable("Should have a terminal in running or updating state")
        const terminal = this.terminalManager.terminals.get(this.terminal) ?? unreachable("Should have a valid terminal id")
        this.setState("stopped")
        await terminal.close()
    }

    public async update() {
        if (this.definition == null) throw new Error("Cannot update a failed service")
        if (this.state == "updating") throw new Error("Cannot update service in current state")
        if (!this.definition.scripts?.update) throw new Error("Service does not have an update script")

        if (this.state == "running") await this.stop()

        if (this.terminal) {
            this.terminalManager.deleteTerminal(this.terminal)
        }
        await this.openTerminal(this.definition.scripts?.update, "updating")
    }

    public makeInfo() {
        return new ServiceInfo({
            id: this.config.id,
            label: this.config.label,
            state: this.definition == null || this.error != null ? "error" : this.state
        })
    }

    protected async openTerminal(command: string, state: this["state"]) {
        const env = Object.fromEntries(this.config.env)
        if (this.definition!.servePath != null) {
            env.SERVE_PATH = this.definition!.servePath
        }

        env[ADMIN_GUI_SOCKET_VARIABLE] = ADMIN_UI_BRIDGE.path
        env["ADMIN_UI_NAME"] = this.adminUIName

        let authFailed = false
        if (this.config.authEnabled) {
            if (this.authKey == null) {
                this.authKey = randomBytes(64)
            }

            if (this.device.config.authURL == null) {
                authFailed = true
            } else {
                const url = new URL("/auth", this.device.config.authURL!)
                url.searchParams.set("service", this.id)

                env["SMWA_KEY"] = this.authKey.toString("base64")
                env["SMWA_URL"] = url.href
            }
        }

        const terminal = this.terminalManager.openTerminal({
            env, command,
            cwd: this.config.path
        })

        this.mutate(v => { v.terminal = terminal.id })
        this.setState(state)
        this.onInfoChanged.emit()

        terminal.onClosed.add(this, (code) => {
            // If this terminal was stopped manually skip
            if (this.state == "stopped") return
            if (code != 0) {
                this.setState("error")
                return
            }
            // TODO: Reset the service if using autostart
            this.setState("stopped")
        })

        if (authFailed) {
            terminal.writeMessage("Failed to enable auth, device auth url is not configured", true)
        }
    }

    public setState(state: this["state"]) {
        this.mutate(v => { v.state = state })
        if (state == "running" || state == "updating") {
            this.mutate(v => { v.uptime = this._device.time })
        } else if (this.uptime != null) {
            this.mutate(v => { v.uptime = this._device.time - this.uptime! })
        }

        this.onInfoChanged.emit()
    }

    public replaceDefinition(definition: ServiceDefinition | null, error: string | null = null) {
        this.mutate(v => { v.definition = definition; v.error = error })
        this.onInfoChanged.emit()
    }

    public static make(config: ServiceConfig, definition: ServiceDefinition | null, error: string | null) {
        return new ServiceController({
            config, definition, error,
            state: "stopped",
            adminUIName: "smwa-service." + config.id,
            terminal: null
        })
    }

}
