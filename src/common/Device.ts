import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class DeviceConfig extends Struct.define("DeviceConfig", {
    label: Type.string,
}) { }

Type.defineMigrations(DeviceConfig.baseType, [])

export const DeviceContract = StructSyncContract.define(class Device extends Struct.define("Device", {
    config: DeviceConfig.ref(),
    os: Type.string,
    interfaces: Type.string.as(Type.array),
    start: Type.number,
    cpuUsage: Type.number,
    memUsage: Type.number,
    errors: Type.string.as(Type.array)
}) { }, {
    setLabel: ActionType.define("setLabel", Type.object({ label: Type.string }), Type.empty)
})