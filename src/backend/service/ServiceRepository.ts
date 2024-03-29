import AdmZip = require("adm-zip")
import { mkdir, readFile, rm } from "fs/promises"
import { join } from "path"
import { asError, unreachable } from "../../comTypes/util"
import { ServiceConfig, ServiceDefinition } from "../../common/Service"
import { DIContext } from "../../dependencyInjection/DIContext"
import { DATABASE } from "../DATABASE"
import { ServiceController } from "./ServiceController"

const SERVICE_DEF_FILE = "smwa.json"
type ServiceLoadResult = ({ type: "not_found", path: string } | { type: "error", error: string } | { type: "success", service: ServiceController }) & { target: ServiceConfig | null }

export function stringifyServiceLoadFailure(result: ServiceLoadResult, config: ServiceConfig | null = null) {
    config ??= result.target
    if (!config) unreachable()
    if (result.type == "success") unreachable()
    return result.type == "not_found" ? `Missing definition file for service "${config.label}"(${config.id}) at ${result.path}`
        : `Failed to load definition for "${config.label}"(${config.id}): ${result.error}`
}

export namespace ServiceRepository {
    export async function loadAllServices(context: DIContext) {
        const queue: Promise<ServiceLoadResult>[] = []
        for (const config of DATABASE.list("service")) {
            queue.push(loadService(config, context))
        }

        return await Promise.all(queue)
    }

    export async function loadServiceDefinition(path: string, target: ServiceConfig | null, debug?: (path: string, definition: any) => void): Promise<ServiceLoadResult | ServiceDefinition> {
        const definitionPath = join(path, SERVICE_DEF_FILE)
        const result = await readFile(definitionPath).catch(asError)
        if (result instanceof Error) {
            debug?.(definitionPath, null)
            if (result.code == "ENOENT") {
                return { target, type: "not_found", path: definitionPath }
            } else {
                return { target, type: "error", error: result.message }
            }
        }

        let definition: ServiceDefinition | null = null
        try {
            definition = ServiceDefinition.deserialize(JSON.parse(result.toString()))
        } catch (err: any) {
            debug?.(definitionPath, result.toString())
            return { target, type: "error", error: err.message }
        }

        if (definition.scripts?.start != null) {
            if (definition.servePath != null) {
                debug?.(definitionPath, definition.serialize())
                return { target, type: "error", error: "Service cannot have both a start script and a serve path" }
            }
        } else {
            if (definition.servePath != null) {
                if (definition.scripts == null) definition.scripts = {}
                definition.scripts.start = process.argv.slice(0, 2).join(" ") + " serve"
            } else {
                debug?.(definitionPath, definition.serialize())
                return { target, type: "error", error: "Service does not have a start script or a serve path" }
            }
        }

        debug?.(definitionPath, definition.serialize())
        return definition
    }

    export async function loadService(config: ServiceConfig, context: DIContext): Promise<ServiceLoadResult> {
        const path = config.path
        const result = await loadServiceDefinition(path, config)
        if (!(result instanceof ServiceDefinition)) return result

        const service = context.instantiate(() => ServiceController.make(config, result, null))

        return { target: config, type: "success", service }
    }

    export async function reloadServiceDefinition(service: ServiceController) {
        const result = await loadServiceDefinition(service.config.path, null)
        if (!(result instanceof ServiceDefinition)) {
            service.replaceDefinition(null, stringifyServiceLoadFailure(result, service.config))
            if (result.type == "success") unreachable()
            return result
        } else {
            service.replaceDefinition(result, null)
        }
    }

    export async function deleteServiceFiles(service: ServiceController) {
        await rm(service.config.path, { recursive: true, force: true })
    }

    export async function applyServiceDeployment(service: ServiceController, content: AdmZip) {
        const wasRunning = service.state == "running"
        await service.stop(!!"ignore errors")
        await deleteServiceFiles(service)
        await mkdir(service.config.path)

        // @ts-ignore
        await new Promise<void>((resolve, reject) => content.extractAllToAsync(service.config.path, true, false, error => error ? reject(error) : resolve()))

        const error = await reloadServiceDefinition(service)
        if (error) return error

        if (service.config.scheduler == "autostart" || wasRunning) {
            await service.start()
        }
    }
}
