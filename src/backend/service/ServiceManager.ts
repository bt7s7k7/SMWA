import { ServiceConfig, ServiceDefinition, ServiceInfo, ServiceManagerContract } from "../../common/Service"
import { makeRandomID, unreachable } from "../../comTypes/util"
import { DIContext } from "../../dependencyInjection/DIContext"
import { Logger } from "../../logger/Logger"
import { LogMarker } from "../../logger/ObjectDescription"
import { ClientError } from "../../structSync/StructSyncServer"
import { DATABASE } from "../DATABASE"
import { DeviceController } from "../DeviceController"
import { ServiceController } from "./ServiceController"
import { ServiceRepository } from "./ServiceRepository"

export class ServiceManager extends ServiceManagerContract.defineController() {
    public readonly context = DIContext.current
    public readonly logger = this.context.inject(Logger).prefix({ label: "SERV", color: "blue" })
    public readonly services = new Map<string, ServiceController>()
    public readonly serviceErrors = new Map<string, string>()

    public impl = super.impl({
        tryPath: async ({ path }) => {
            const result = await ServiceRepository.loadServiceDefinition(path, null)
            if (result instanceof ServiceDefinition) return result

            if (result.type == "not_found") {
                throw new ClientError("Folder does not contain a definition file")
            } else if (result.type == "error") {
                throw new ClientError("Failed to read definition file: " + result.error)
            } else unreachable()
        },
        createService: async ({ path, label }) => {
            const config = new ServiceConfig({
                label, path,
                id: makeRandomID(),
            })

            const result = await ServiceRepository.loadService(config)

            if (result.type == "not_found") {
                throw new ClientError("Folder does not contain a definition file")
            } else if (result.type == "error") {
                throw new ClientError("Failed to read definition file: " + result.error)
            }

            const service = result.service
            this.addService(service)
            DATABASE.put("service", config)
            this.logger.info`Created new service ${config.label}`
            return service.config.id
        }
    })

    public async init() {
        this.logger.info`Loading services...`
        for (const result of await ServiceRepository.loadAllServices()) {
            if (result.type == "success") {
                this.addService(result.service)
            } else {
                const error =
                    result.type == "not_found" ? `Missing definition file for service "${result.target!.label}"(${result.target!.id}) at ${result.path}`
                        : `Failed to load definition for "${result.target!.label}"(${result.target!.id}): ${result.error}`
                this.logger.error`${LogMarker.rawText(error)}`
                this.device.addError(error)
                this.mutate(v => v.serviceList.push(new ServiceInfo({ id: result.target!.id, label: result.target!.label, state: "error" })))
                this.serviceErrors.set(result.target!.id, error)
            }
        }
        this.logger.info`Services loaded`
    }

    public addService(service: ServiceController) {
        const duplicate = this.services.get(service.config.id)
        if (duplicate) {
            throw new Error(`Duplicate service loaded with id ${service.config.id}; "${service.config.label}" at ${service.config.path} vs "${duplicate.config.label}" at ${duplicate.config.path}`)
        }

        this.context.instantiate(() => service.register())
        this.services.set(service.config.id, service)

        this.updateServiceInfo(service)
    }

    public updateServiceInfo(service: ServiceController, shouldDelete?: boolean) {
        const index = this.serviceList.findIndex(v => v.id == service.config.id)
        if (index == -1) {
            this.mutate(v => v.serviceList.push(service.makeInfo()))
        } else {
            if (shouldDelete) {
                this.mutate(v => v.serviceList.splice(index, 1))
            } else {
                this.mutate(v => v.serviceList[index] = service.makeInfo())
            }
        }
    }

    constructor(
        public readonly device: DeviceController
    ) { super({ serviceList: [] }) }
}