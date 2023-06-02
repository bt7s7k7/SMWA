import { join } from "path"
import { makeRandomID, unreachable } from "../../comTypes/util"
import { ServiceConfig, ServiceDefinition, ServiceManagerContract } from "../../common/Service"
import { DIContext } from "../../dependencyInjection/DIContext"
import { DISPOSE } from "../../eventLib/Disposable"
import { Logger } from "../../logger/Logger"
import { LogMarker } from "../../logger/ObjectDescription"
import { ClientError, StructSyncServer } from "../../structSync/StructSyncServer"
import { DATABASE } from "../DATABASE"
import { DeviceController } from "../DeviceController"
import { convertPathFromFileBrowserToSystem } from "../FileBrowserController"
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
            path = convertPathFromFileBrowserToSystem(path)

            const result = await ServiceRepository.loadServiceDefinition(path, null/* , (path, definition) => this.logger.warn`Service definition not loaded: ${{ path, definition }}` */)
            if (result instanceof ServiceDefinition) return result

            if (result.type == "not_found") {
                throw new ClientError("Folder does not contain a definition file")
            } else if (result.type == "error") {
                throw new ClientError("Failed to read definition file: " + result.error)
            } else unreachable()
        },
        createService: async ({ path, label }) => {
            path = convertPathFromFileBrowserToSystem(path)

            const config = ServiceConfig.make({ label, path })

            const result = await ServiceRepository.loadService(config, this.context)

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
        },
        createServiceDeploy: async ({ label }) => {
            const deployPath = this.device.config.deployPath
            if (deployPath == null) throw new ClientError("No deploy path set, see machine access screen")
            const id = makeRandomID()
            const filename = label.replace(/ (.)/g, (_, v) => v.toUpperCase()).replace(/[^\w]/g, "_") + "_" + id
            const path = join(deployPath, filename)
            const config = ServiceConfig.make({ id, label, path })

            const service = this.context.instantiate(() => ServiceController.make(config, null, "This service was not deployed yet"))
            DATABASE.put("service", service.config)
            this.addService(service)
            this.logger.info`Created new deploy service ${config.label}`

            return { id }
        }
    })

    public async init() {
        this.logger.info`Loading services...`
        for (const result of await ServiceRepository.loadAllServices(this.context)) {
            if (result.type == "success") {
                this.addService(result.service)
            } else {
                const error = this.device.config.deployPath && result.type == "not_found" && result.path.startsWith(this.device.config.deployPath) ? "Service was not deployed yet"
                    : stringifyServiceLoadFailure(result)
                this.logger.error`${LogMarker.rawText(error)}`
                this.addService(this.context.instantiate(() => ServiceController.make(result.target!, null, error)))
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
        service.device = this.device

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
        service[DISPOSE]()
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
