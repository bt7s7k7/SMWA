import { DIContext } from "../../dependencyInjection/DIContext"
import { DISPOSE } from "../../eventLib/Disposable"
import { EventListener } from "../../eventLib/EventListener"
import { Logger } from "../../logger/Logger"
import { TerminalHandleController, TerminalOptions } from "./TerminalHandleController"

export class TerminalManager extends EventListener {
    public readonly context = DIContext.current
    public readonly logger = this.context.inject(Logger).prefix({ label: "TERM", color: "yellow" })
    public readonly terminals = new Map<string, TerminalHandleController>()

    public [DISPOSE]() {
        for (const terminal of this.terminals.values()) {
            terminal.close()
        }

        super[DISPOSE]()
    }

    public openTerminal(options: TerminalOptions) {
        const handle = this.context.instantiate(() => TerminalHandleController.make(options))
        this.terminals.set(handle.id, handle)

        this.context.instantiate(() => handle.register())

        this.logger.info`Opened terminal ${handle.id}`

        return handle
    }

    public async deleteTerminal(handle: TerminalHandleController) {
        this.terminals.delete(handle.id)
        this.logger.info`Deleted terminal ${handle.id}`
        handle[DISPOSE]()
    }
}