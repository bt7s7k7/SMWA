import { makeRandomID } from "../comTypes/util"
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
    scheduler: ServiceScheduler_t,
    env: Type.string.as(Type.record)
}) {
    public static make({ id = makeRandomID(), label, path }: { id?: string, label: string, path: string }) {
        return new ServiceConfig({
            id, label, path,
            scheduler: "disabled",
            env: {}
        })
    }
}
Type.defineMigrations(ServiceConfig.baseType, [
    {
        version: 3,
        desc: "Added env",
        migrate: v => Object.assign(v, { env: {} })
    },
    {
        version: 2,
        desc: "Added scheduler",
        migrate: v => Object.assign(v, { scheduler: "disabled" })
    }
])

export class ServiceDefinition extends Struct.define("ServiceDefinition", {
    name: Type.string,
    scripts: Type.object({
        start: Type.string.as(Type.nullable),
        update: Type.string.as(Type.nullable)
    }).as(Type.nullable),
    servePath: Type.string.as(Type.nullable)
}) { }
Type.defineMigrations(ServiceDefinition.baseType, [])

export const ServiceContract = StructSyncContract.define(class Service extends Struct.define("Service", {
    state: ServiceState_t,
    terminal: Type.string.as(Type.nullable),
    config: ServiceConfig.ref(),
    definition: ServiceDefinition.ref().as(Type.nullable),
    error: Type.string.as(Type.nullable),
    /** When the service is running or updating, this contains the start time, else this contains the uptime */
    uptime: Type.number.as(Type.nullable)
}) {
    public get id() { return this.config.id }
}, {
    setLabel: ActionType.define("setLabel", Type.object({ label: Type.string }), Type.empty),
    start: ActionType.define("start", Type.empty, Type.empty),
    stop: ActionType.define("stop", Type.empty, Type.empty),
    update: ActionType.define("update", Type.empty, Type.empty),
    setScheduler: ActionType.define("setScheduler", Type.object({ scheduler: ServiceScheduler_t }), Type.empty),
    reloadDefinition: ActionType.define("reloadDefinition", Type.empty, Type.empty),
    setEnvVariable: ActionType.define("setEnvVariable", Type.object({ key: Type.string, value: Type.string.as(Type.nullable), replace: Type.string.as(Type.nullable) }), Type.empty)
})

export const ServiceManagerContract = StructSyncContract.define(class ServiceManager extends Struct.define("ServiceManager", {
    serviceList: ServiceInfo.ref().as(Type.array)
}) { }, {
    tryPath: ActionType.define("tryPath", Type.object({ path: Type.string }), ServiceDefinition.ref()),
    createService: ActionType.define("createService", Type.object({ path: Type.string, label: Type.string }), Type.string),
    deleteService: ActionType.define("deleteService", Type.object({ id: Type.string, deleteFiles: Type.boolean }), Type.empty),
    createServiceDeploy: ActionType.define("createServiceDeploy", Type.object({ label: Type.string }), Type.object({ id: Type.string }))
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