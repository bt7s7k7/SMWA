import * as pty from "node-pty"
import { platform } from "os"
import { SerializeAddon } from "xterm-addon-serialize"
import { Terminal } from "xterm-headless"
import { makeRandomID } from "../../comTypes/util"
import { TerminalHandleContract } from "../../common/Terminal"
import { DISPOSE } from "../../eventLib/Disposable"
import { ConsoleColorUtils } from "../../nodeLogger/ConsoleColorUtils"
import process = require("process")

const shell = platform() === "win32" ? "powershell.exe" : (process.env.SHELL ?? "bash")

export interface TerminalOptions {
    cwd?: string,
    command?: string,
    virtual?: boolean,
    id?: string,
    env?: Record<string, string>
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

    public writeMessage(message: string, topMargin?: boolean) {
        const timestamp = new Date().toLocaleString("sv")
        message = ConsoleColorUtils.addStyle(`[${timestamp}] ${message}`, "gray") + ConsoleColorUtils.addStyle(" ", "white") + "\r\n"
        if (topMargin) message = "\r\n\r\n" + message
        this.write(message)
    }

    public write(message: string) {
        this.onData.emit(message)
        this.terminal.write(message)
    }

    public static make(options: TerminalOptions) {
        const id = options.id ?? makeRandomID()
        const env = Object.assign({}, process.env) as Record<string, string>
        delete env["PORT"]
        delete env["DB_PATH"]
        delete env["BASE_DIR"]
        if (options.env) Object.assign(env, options.env)

        const process_1 = options.virtual ? null : pty.spawn(shell, options.command ? ["-c", options.command] : [], {
            name: "xterm-color",
            cwd: options.cwd ?? process.env.HOME ?? "/",
            cols: 160,
            rows: 60,
            env
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

        if (options.command) {
            handle.writeMessage(`$ ${options.command}`)
        }

        if (process_1) {
            process_1.onData((data) => {
                handle.write(data)
            })

            process_1.onExit(({ exitCode, signal }) => {
                handle.writeMessage(`Process exited with code: ${exitCode}${signal ? `, signal: ${signal}` : ""}`, !!"use top margin")
                handle.onClosed.emit(exitCode)
                handle.process = null
            })
        }

        return handle
    }
}
