import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export const ServiceState_t = Type.stringUnion("running", "updating", "stopped", "error")
export const ServiceScheduler_t = Type.stringUnion("disabled", "autostart")

export class ServiceInfo extends Struct.define("ServiceInfo", {
    label: Type.string,
    id: Type.string,
    state: ServiceState_t
}) { }

export class ServiceConfig extends Struct.define("ServiceConfig", {
    id: Type.string,
    label: Type.string,
    path: Type.string,
    scheduler: ServiceScheduler_t
}) { }
Type.defineMigrations(ServiceConfig.baseType, [
    {
        version: 2,
        desc: "Added scheduler",
        migrate: v => Object.assign(v, { scheduler: "disabled" })
    }
])

export class ServiceDefinition extends Struct.define("ServiceDefinition", {
    name: Type.string,
    scripts: Type.object({
        start: Type.string,
        update: Type.string.as(Type.nullable)
    })
}) { }
Type.defineMigrations(ServiceDefinition.baseType, [])

export const ServiceContract = StructSyncContract.define(class Service extends Struct.define("Service", {
    state: ServiceState_t,
    terminal: Type.string.as(Type.nullable),
    config: ServiceConfig.ref(),
    definition: ServiceDefinition.ref(),
    /** When the service is running or updating, this contains the start time, else this contains the uptime */
    uptime: Type.number.as(Type.nullable)
}) {
    public get id() { return this.config.id }
}, {
    setLabel: ActionType.define("setLabel", Type.object({ label: Type.string }), Type.empty),
    start: ActionType.define("start", Type.empty, Type.empty),
    stop: ActionType.define("stop", Type.empty, Type.empty),
    update: ActionType.define("update", Type.empty, Type.empty),
    setScheduler: ActionType.define("setScheduler", Type.object({ scheduler: ServiceScheduler_t }), Type.empty)
})

export const ServiceManagerContract = StructSyncContract.define(class ServiceManager extends Struct.define("ServiceManager", {
    serviceList: ServiceInfo.ref().as(Type.array)
}) { }, {
    tryPath: ActionType.define("tryPath", Type.object({ path: Type.string }), ServiceDefinition.ref()),
    createService: ActionType.define("createService", Type.object({ path: Type.string, label: Type.string }), Type.string),
    getServiceError: ActionType.define("getServiceError", Type.object({ id: Type.string }), Type.string.as(Type.nullable)),
    deleteService: ActionType.define("deleteService", Type.object({ id: Type.string }), Type.empty)
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