import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class DeviceConfig extends Struct.define("DeviceConfig", {
    label: Type.string,
    deployPath: Type.string.as(Type.nullable),
    authURL: Type.string.as(Type.nullable)
}) { }

export const DeviceContract = StructSyncContract.define(class Device extends Struct.define("Device", {
    config: DeviceConfig.ref(),
    os: Type.string,
    interfaces: Type.string.as(Type.array),
    start: Type.number,
    cpuUsage: Type.number,
    memUsage: Type.number,
    errors: Type.string.as(Type.array),
    time: Type.number,
    uptime: Type.number
}) { }, {
    setLabel: ActionType.define("setLabel", Type.object({ label: Type.string }), Type.empty),
    setDeployPath: ActionType.define("setDeployPath", Type.object({ path: Type.string }), Type.empty),
    setAuthURL: ActionType.define("setAuthURL", Type.object({ url: Type.string.as(Type.nullable) }), Type.empty),
    authenticate: ActionType.define("authenticate", Type.object({ service: Type.string }), Type.string)
})
