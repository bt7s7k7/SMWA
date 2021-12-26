import { PersonalTerminalSpawnerContract } from "../../common/Terminal"
import { DIContext } from "../../dependencyInjection/DIContext"
import { StructSyncSession } from "../../structSync/StructSyncSession"
import { TerminalHandleController } from "./TerminalHandleController"
import { TerminalManager } from "./TerminalManager"

const handles = new WeakMap<StructSyncSession, TerminalHandleController>()

export class PersonalTerminalSpawnerController extends PersonalTerminalSpawnerContract.defineController() {
    public readonly terminalManager = DIContext.current.inject(TerminalManager)

    public createFinalizer(session: StructSyncSession) {
        return () => {
            const handle = handles.get(session)
            if (!handle) return

            this.terminalManager.deleteTerminal(handle)

            handles.delete(session)
        }
    }

    public impl = super.impl({
        open: async (options, meta) => {
            const handle = handles.get(meta.session)
            if (handle) return handle.id

            const newHandle = this.terminalManager.openTerminal({})
            handles.set(meta.session, newHandle)

            return newHandle.id
        },
        close: async (_, meta) => {
            const handle = handles.get(meta.session)
            if (!handle) return

            await this.terminalManager.deleteTerminal(handle)
            handles.delete(meta.session)
        }
    })
}