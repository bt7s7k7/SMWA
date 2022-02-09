import AdmZip = require("adm-zip")
import { ServiceConfig, ServiceContract, ServiceDefinition, ServiceInfo } from "../../common/Service"
import { unreachable } from "../../comTypes/util"
import { EventEmitter } from "../../eventLib/EventEmitter"
import { ClientError } from "../../structSync/StructSyncServer"
import { DATABASE } from "../DATABASE"
import { TerminalManager } from "../terminal/TerminalManager"

export class ServiceController extends ServiceContract.defineController() {
    public readonly onInfoChanged = new EventEmitter()
    public terminalManager: TerminalManager = null!

    public impl = super.impl({
        setLabel: async ({ label }) => {
            this.mutate(v => v.config.label = label)
            DATABASE.setDirty()
            this.onInfoChanged.emit()
        },
        start: async () => {
            if (this.state == "running" || this.state == "updating") throw new ClientError("Cannot start service in current state")
            await this.start()
        },
        stop: async () => {
            if (this.state != "running" && this.state != "updating") throw new ClientError("Cannot stop service in current state")
            await this.stop()
        },
        update: async () => {
            if (this.state == "running") throw new ClientError("Cannot update service in current state")
            if (!this.definition.scripts.update) throw new ClientError("Service does not have an update script")
            await this.update()
        },
        setScheduler: async ({ scheduler }) => {
            this.mutate(v => v.config.scheduler = scheduler)
            DATABASE.setDirty()
        }
    })

    public async start() {
        if (this.state == "running" || this.state == "updating") throw new Error("Cannot start service in current state")
        if (this.terminal) {
            this.terminalManager.deleteTerminal(this.terminal)
        }

        await this.openTerminal(this.definition.scripts.start, "running")
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
        if (this.state == "updating") throw new Error("Cannot update service in current state")
        if (!this.definition.scripts.update) throw new Error("Service does not have an update script")

        if (this.state == "running") await this.stop()
        await this.openTerminal(this.definition.scripts.update, "updating")
    }

    public makeInfo() {
        return new ServiceInfo({
            id: this.config.id,
            label: this.config.label,
            state: this.state
        })
    }

    protected async openTerminal(command: string, state: this["state"]) {
        const terminal = this.terminalManager.openTerminal({
            cwd: this.config.path,
            command
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
    }

    public setState(state: this["state"]) {
        this.mutate(v => { v.state = state })
        if (state == "running" || state == "updating") {
            this.mutate(v => { v.uptime = Date.now() })
        } else if (this.uptime != null) {
            this.mutate(v => { v.uptime = Date.now() - this.uptime! })
        }

        this.onInfoChanged.emit()
    }

    public replaceDefinition(definition: ServiceDefinition) {
        this.mutate(v => v.definition = definition)
    }

    public static make(config: ServiceConfig, definition: ServiceDefinition) {
        return new ServiceController({
            config, definition,
            state: "stopped",
            terminal: null
        })
    }

}