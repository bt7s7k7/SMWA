import AdmZip = require("adm-zip")
import { mkdir, readFile, rm } from "fs/promises"
import { join } from "path"
import { ServiceConfig, ServiceDefinition } from "../../common/Service"
import { asError, unreachable } from "../../comTypes/util"
import { DATABASE } from "../DATABASE"
import { ServiceController } from "./ServiceController"

const SERVICE_DEF_FILE = "smwa.json"
type ServiceLoadResult = ({ type: "not_found", path: string } | { type: "error", error: string } | { type: "success", service: ServiceController }) & { target: ServiceConfig | null }

export namespace ServiceRepository {
    export async function loadAllServices() {
        const queue: Promise<ServiceLoadResult>[] = []
        for (const config of DATABASE.list("service")) {
            queue.push(loadService(config))
        }

        return await Promise.all(queue)
    }

    export async function loadServiceDefinition(path: string, target: ServiceConfig | null): Promise<ServiceLoadResult | ServiceDefinition> {
        const definitionPath = join(path, SERVICE_DEF_FILE)
        const result = await readFile(definitionPath).catch(asError)
        if (result instanceof Error) {
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
            return { target, type: "error", error: err.message }
        }

        return definition
    }

    export async function loadService(config: ServiceConfig): Promise<ServiceLoadResult> {
        const path = config.path
        const result = await loadServiceDefinition(path, config)
        if (!(result instanceof ServiceDefinition)) return result

        const service = ServiceController.make(config, result)

        return { target: config, type: "success", service }
    }

    export async function reloadServiceDefinition(service: ServiceController) {
        const newDefinition = await loadServiceDefinition(service.config.path, null)
        if (!(newDefinition instanceof ServiceDefinition)) {
            if (newDefinition.type == "success") unreachable()
            return newDefinition
        }

        service.replaceDefinition(newDefinition)
    }

    export async function applyServiceDeployment(service: ServiceController, content: AdmZip) {
        await service.stop(!!"ignore errors")
        await rm(service.config.path, { recursive: true, force: true })
        await mkdir(service.config.path)

        // @ts-ignore
        await new Promise<void>((resolve, reject) => content.extractAllToAsync(service.config.path, true, false, error => error ? reject(error) : resolve()))

        const error = await reloadServiceDefinition(service)
        if (error) return error
    }
}