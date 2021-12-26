import * as pty from "node-pty"
import { platform } from "os"
import { SerializeAddon } from "xterm-addon-serialize"
import { Terminal } from "xterm-headless"
import { TerminalHandleContract } from "../../common/Terminal"
import { makeRandomID } from "../../comTypes/util"
import { DISPOSE } from "../../eventLib/Disposable"
import { ConsoleColorUtils } from "../../nodeLogger/ConsoleColorUtils"
import process = require("process")

const shell = platform() === "win32" ? "powershell.exe" : (process.env.SHELL ?? "bash")

export interface TerminalOptions {
    cwd?: string
}

export class TerminalHandleController extends TerminalHandleContract.defineController() {
    public process: pty.IPty | null = null
    public readonly terminal: Terminal = null!
    public readonly terminalSerializer: SerializeAddon = null!

    public [DISPOSE]() {
        super[DISPOSE]()

        if (this.process) {
            this.process.kill()
            this.process = null
        }
    }

    public impl = super.impl({
        getBuffer: async () => {
            return this.terminalSerializer.serialize()
        },
        write: async (data) => {
            if (this.process) {
                this.process.write(data)
            }
        },
        close: async () => await this.close(),
        resize: async ({ size }) => {
            if (this.process) {
                this.process.resize(size.cols, size.rows)
                this.terminal.resize(size.cols, size.rows)
                this.onResize.emit(size)
            }
        }
    })

    public async close() {
        if (this.process) {
            this.process.kill()
            this.process = null

            this.mutate(v => v.open = false)
        }
    }

    public static make(options: TerminalOptions) {
        const id = makeRandomID()
        const process_1 = pty.spawn(shell, [], {
            name: "xterm-color",
            cwd: options.cwd ?? process.env.HOME ?? "/",
            cols: 160,
            rows: 60,
        })

        const terminal = new Terminal({
            cols: 160,
            rows: 60,
            convertEol: true
        })

        const terminalSerializer = new SerializeAddon()
        terminal.loadAddon(terminalSerializer)

        const handle = new TerminalHandleController({ id, open: true })
        Object.assign(handle, { process: process_1, terminal, terminalSerializer })

        process_1.onData((data) => {
            handle.onData.emit(data)
            terminal.write(data)
        })

        process_1.onExit(({ exitCode, signal }) => {
            const closedMessage = "\r\n" + ConsoleColorUtils.addStyle(`Process exited with code ${exitCode}${signal ? `, signal ${signal}` : ""}`, "gray") + "\n\r"
            handle.onData.emit(closedMessage)
            terminal.write(closedMessage)
            handle.onClosed.emit()
            handle.process = null
        })

        return handle
    }
}