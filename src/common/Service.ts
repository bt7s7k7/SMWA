import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export const ServiceState_t = Type.stringUnion("running", "updating", "stopped", "error")

export class ServiceInfo extends Struct.define("ServiceInfo", {
    label: Type.string,
    id: Type.string,
    state: ServiceState_t
}) { }

export class ServiceConfig extends Struct.define("ServiceConfig", {
    id: Type.string,
    label: Type.string,
    path: Type.string
}) { }
Type.defineMigrations(ServiceConfig.baseType, [])

export class ServiceDefinition extends Struct.define("ServiceDefinition", {
    name: Type.string,
    scripts: Type.object({
        start: Type.string,
        update: Type.string.as(Type.nullable)
    })
}) { }
Type.defineMigrations(ServiceConfig.baseType, [])

export const ServiceContract = StructSyncContract.define(class Service extends Struct.define("Service", {
    state: ServiceState_t,
    terminal: Type.string.as(Type.nullable),
    config: ServiceConfig.ref(),
    definition: ServiceDefinition.ref()
}) { }, {})

export const ServiceManagerContract = StructSyncContract.define(class ServiceManager extends Struct.define("ServiceManager", {
    serviceList: ServiceInfo.ref().as(Type.array)
}) { }, {
    tryPath: ActionType.define("tryPath", Type.object({ path: Type.string }), ServiceDefinition.ref()),
    createService: ActionType.define("createService", Type.object({ path: Type.string, label: Type.string }), Type.string)
})

/* interface Service {
    state: "running" | "updating" | "stopped" | "error"
    terminal: string | null
    config: {
        id: string
        label: string
        path: string

        startType: "manual" | "automatic" // defer
        restart: number // defer
        env: Record<string, string> // defer
    }
    definition: {
        name: string
        icon: string // defer
        scripts: {
            start: string
            update?: string
        }
    }
} */