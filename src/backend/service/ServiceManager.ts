import { ServiceConfig, ServiceDefinition, ServiceManagerContract } from "../../common/Service"
import { makeRandomID, unreachable } from "../../comTypes/util"
import { DIContext } from "../../dependencyInjection/DIContext"
import { Logger } from "../../logger/Logger"
import { LogMarker } from "../../logger/ObjectDescription"
import { ClientError, StructSyncServer } from "../../structSync/StructSyncServer"
import { DATABASE } from "../DATABASE"
import { DeviceController } from "../DeviceController"
import { TerminalManager } from "../terminal/TerminalManager"
import { ServiceController } from "./ServiceController"
import { ServiceRepository, stringifyServiceLoadFailure } from "./ServiceRepository"

export class ServiceManager extends ServiceManagerContract.defineController() {
    public readonly context = DIContext.current
    public readonly logger = this.context.inject(Logger).prefix({ label: "SERV", color: "blue" })
    public readonly terminalManager = DIContext.current.inject(TerminalManager)
    public readonly services = new Map<string, ServiceController>()
    protected readonly servers: StructSyncServer[] = []

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
                scheduler: "disabled"
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
        },
        deleteService: async ({ id, deleteFiles }) => {
            const service = this.services.get(id)
            if (!service) throw new ClientError(`Cannot find service "${id}"`)

            await this.deleteService(service, deleteFiles)
        }
    })

    public async init() {
        this.logger.info`Loading services...`
        for (const result of await ServiceRepository.loadAllServices()) {
            if (result.type == "success") {
                this.addService(result.service)
            } else {
                const error = stringifyServiceLoadFailure(result)
                this.logger.error`${LogMarker.rawText(error)}`
                this.addService(ServiceController.make(result.target!, null, error))
            }
        }
        this.logger.info`Services loaded`
    }

    public addService(service: ServiceController) {
        const duplicate = this.services.get(service.config.id)
        if (duplicate) {
            throw new Error(`Duplicate service loaded with id ${service.config.id}; "${service.config.label}" at ${service.config.path} vs "${duplicate.config.label}" at ${duplicate.config.path}`)
        }

        for (const server of this.servers) {
            service.register(server)
        }
        this.services.set(service.config.id, service)

        this.updateServiceInfo(service)
        service.onInfoChanged.add(this, () => {
            this.updateServiceInfo(service)
        })
        service.terminalManager = this.terminalManager

        if (service.config.scheduler != "disabled") {
            service.start()
        }
    }

    public updateServiceInfo(service: ServiceController, shouldDelete?: boolean): void
    public updateServiceInfo(service: string, shouldDelete: true): void
    public updateServiceInfo(service: ServiceController | string, shouldDelete?: boolean) {
        const id = typeof service == "string" ? service : service.config.id
        const index = this.serviceList.findIndex(v => v.id == id)
        if (index == -1) {
            if (typeof service == "string") unreachable()
            this.mutate(v => v.serviceList.push(service.makeInfo()))
        } else {
            if (shouldDelete) {
                this.mutate(v => v.serviceList.splice(index, 1))
            } else {
                if (typeof service == "string") unreachable()
                this.mutate(v => v.serviceList[index] = service.makeInfo())
            }
        }
    }

    public async deleteService(service: ServiceController, deleteFiles: boolean) {
        await service.stop(!!"ignore errors")

        if (deleteFiles) {
            ServiceRepository.deleteServiceFiles(service)
        }

        this.updateServiceInfo(service, !!"delete")
        this.services.delete(service.config.id)
        DATABASE.delete("service", service.config.id)
    }

    public connect() {
        this.register()

        const server = DIContext.current.inject(StructSyncServer)
        this.servers.push(server)
        for (const service of this.services.values()) {
            service.register(server)
        }

        return this
    }


    constructor(
        public readonly device: DeviceController
    ) { super({ serviceList: [] }) }
}