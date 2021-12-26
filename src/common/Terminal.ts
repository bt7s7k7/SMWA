import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { EventType } from "../structSync/EventType"
import { StructSyncContract } from "../structSync/StructSyncContract"

const TerminalSize_t = Type.object({
    rows: Type.number,
    cols: Type.number
})

export const TerminalHandleContract = StructSyncContract.define(class TerminalHandle extends Struct.define("TerminalHandle", {
    id: Type.string,
    open: Type.boolean
}) { }, {
    getBuffer: ActionType.define("getBuffer", Type.empty, Type.string),
    write: ActionType.define("write", Type.string, Type.empty),
    close: ActionType.define("close", Type.empty, Type.empty),
    resize: ActionType.define("resize", Type.object({ size: TerminalSize_t }), Type.empty)
}, {
    onData: EventType.define("onData", Type.string),
    onClosed: EventType.define("onClosed", Type.empty),
    onResize: EventType.define("onResize", TerminalSize_t)
})

export const PersonalTerminalSpawnerContract = StructSyncContract.define(class PersonalTerminalSpawner extends Struct.define("PersonalTerminalSpawner", {}) { }, {
    open: ActionType.define("open", Type.object({ cwd: Type.string.as(Type.nullable) }), Type.string),
    close: ActionType.define("close", Type.empty, Type.empty)
})