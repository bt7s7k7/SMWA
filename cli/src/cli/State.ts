import axios from "axios"
import chalk from "chalk"
import FormData from "form-data"
import { readFile, writeFile } from "fs/promises"
import { URL } from "url"
import { DeviceContract } from "../common/Device"
import { ServiceContract, ServiceDefinition, ServiceManagerContract, ServiceState_t } from "../common/Service"
import { asError } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Type } from "../struct/Type"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { StructSyncAxios } from "../structSyncAxios/StructSyncAxios"
import { Config } from "./Config"
import { UI } from "./UI"

const COLORS_PER_STATE: Record<Type.GetTypeFromTypeWrapper<typeof ServiceState_t>, (v: string) => string> = {
    error: chalk.redBright,
    running: chalk.greenBright,
    stopped: chalk.gray,
    updating: chalk.blueBright
}

async function loadDefinition() {
    const result = await readFile("./smwa.json").catch(asError)
    if (result instanceof Error) {
        if (result.code == "ENOENT") {
            UI.error("No definition file found, run init to create a service")
            return null
        }

        throw result
    }

    let definition: ServiceDefinition
    try {
        definition = ServiceDefinition.deserialize(JSON.parse(result.toString()))
    } catch (err: any) {
        UI.error("Failed to load deploy file:" + err.message)
        return null
    }

    return definition
}

const serviceManagerProxy = ServiceManagerContract.defineProxy()
const deviceProxy = DeviceContract.defineProxy()
const serviceProxy = ServiceContract.defineProxy()
export class State {
    public readonly context = new DIContext()
    public readonly uploadURL = new URL("upload", this.config.url).href

    public async deploy(zipData: Buffer) {
        const data = new FormData()
        data.append("file", zipData)
        const uploadURL = new URL("upload", this.uploadURL)
        uploadURL.searchParams.set("service", this.config.service!)
        const result = await axios.post(uploadURL.href, data, {
            headers: data.getHeaders({
                "Authorization": "Bearer " + this.config.token,
            }),
            onUploadProgress: (event: { loaded: number, total: number }) => {
                console.log(event)
            },
            maxBodyLength: Infinity
        }).catch(asError)

        if (result instanceof Error) {
            if (axios.isAxiosError(result) && result.response) {
                UI.error(`Upload error: ${result.response!.data}`)
            } else {
                UI.error(`Upload error: ${result.message}`)
            }
        } else {
            UI.success("Done!")
        }

    }

    public async getServiceManager() {
        const work = UI.indeterminateProgress("Loading service list...")
        const result = await serviceManagerProxy.make(this.context, { track: false }).catch(asError)
        work.done()
        if (result instanceof Error) {
            UI.error(`Failed to fetch data from the server: ${result.message}`)
            return null
        } else {
            return result
        }
    }

    public async getServiceList() {
        return this.getServiceManager().then(v => v ? v.serviceList : null)
    }

    public async getDeviceInfo() {
        const work = UI.indeterminateProgress("Loading device info...")
        const result = await deviceProxy.make(this.context, { track: false }).catch(asError)
        work.done()
        if (result instanceof Error) {
            UI.error(`Failed to fetch data from the server: ${result.message}`)
            return null
        } else {
            return result
        }
    }

    public async getServiceInfo() {
        const id = this.config.service
        if (!id) return null
        const work = UI.indeterminateProgress("Loading service info...")
        const result = await serviceProxy.make(this.context, { id, track: false }).catch(asError)
        work.done()
        if (result instanceof Error) {
            UI.error(`Failed to fetch data from the server: ${result.message}`)
            return null
        } else {
            return result
        }
    }

    public async save() {
        await writeFile("./smwa-deploy.json", JSON.stringify(this.config.serialize(), null, 4))
    }

    public setService(service: string) {
        this.config.service = service
    }

    public async openServiceSelection() {
        const services = await this.getServiceList()
        if (services == null) return

        const service = await UI.select("Selected target service", [...services, "new_service" as const], v => v == "new_service" ? chalk.yellowBright("New service") : v.label)
        if (service == null) return

        if (service == "new_service") {
            const label = await UI.prompt("Enter new service label")
            if (!label) return

            const manager = await this.getServiceManager()
            if (!manager) return

            const result = await manager.createServiceDeploy({ label }).catch(asError)
            if (result instanceof Error) {
                UI.error(`Failed to create service: ${result.message}`)
            } else {
                this.setService(result.id)
            }
        } else {
            this.setService(service.id)
        }
    }

    public async printInfo() {
        const device = await this.getDeviceInfo()
        if (!device) {
            UI.error("Failed to fetch device data")
            return
        }

        UI.writeLine(`${chalk.bold("Server:")} ${this.config.url}`)
        UI.writeLine(` ${chalk.bold("Label:")} ${device.config.label}`)
        UI.writeLine(`    ${chalk.bold("OS:")} ${device.os}`)

        const services = await this.getServiceList()
        if (!services) {
            UI.error("Filed to fetch services")
            return
        }

        UI.writeLine("")
        UI.writeLine(chalk.bold(`Services:`))
        for (const service of services) {
            UI.writeLine(`  ${COLORS_PER_STATE[service.state](service.label)} ${service.id == this.config.service ? "(*)" : ""}`)
        }


        if (this.config.service) {
            const service = await this.getServiceInfo()
            if (!service) {
                UI.error("Failed to fetch service data")
                return
            }

            UI.writeLine("")
            UI.writeLine(`  ${chalk.bold("Service:")} ${service.config.label} ${chalk.grey(`(${service.config.id})`)}`)
            UI.writeLine(`     ${chalk.bold("Type:")} ${service.definition?.name ?? "<error>"}`)
            UI.writeLine(`     ${chalk.bold("Path:")} ${service.config.path}`)
            UI.writeLine(`    ${chalk.bold("State:")} ${COLORS_PER_STATE[service.state](service.state.toUpperCase())}`)
            UI.writeLine(`${chalk.bold("Scheduler:")} ${service.config.scheduler}`)
        }
    }

    public async printServiceEnv() {
        const service = await this.getServiceInfo()
        if (!service) return

        for (const [key, value] of Object.entries(service.config.env)) {
            UI.writeLine(`${key}=${value}`)
        }
    }

    public async changeEnvVariable(options: { key: string, value?: string, replace?: string }) {
        const service = await this.getServiceInfo()
        if (!service) return

        const work = UI.indeterminateProgress("Working...")
        const result = await service.setEnvVariable(options).catch(asError)
        work.done()

        if (result instanceof Error) {
            UI.error(`Failed to change env: ${result.message}`)
            return false
        }

        return true
    }

    constructor(
        public readonly config: Config
    ) {
        this.context.provide(IDProvider, () => new IDProvider.Incremental())
        this.context.provide(MessageBridge, () => new StructSyncAxios(new URL("api", config.url).href))
        this.context.provide(StructSyncClient, "default")
    }

    public static async createFromUserInput() {
        const url = await UI.prompt("Enter server URL")
        if (!url) return null
        const token = await UI.prompt("Enter access token")
        if (!token) return null

        const state = new State(new Config({ url, token }))
        const result = await state.getDeviceInfo()
        if (result == null) {
            UI.error("Aborting initialization. Make sure the server url includes the api path.")
            return null
        }

        UI.success(`Connected to device "${result.config.label}"`)

        await state.openServiceSelection()

        await state.printInfo()

        return state
    }

    public static async createFromConfig() {
        const result = await readFile("./smwa-deploy.json").catch(asError)
        if (result instanceof Error) {
            if (result.code == "ENOENT") {
                UI.error("No deploy file found")
                return null
            }

            throw result
        }

        let config: Config
        try {
            config = Config.deserialize(JSON.parse(result.toString()))
        } catch (err: any) {
            UI.error("Failed to load deploy file:" + err.message)
            return null
        }

        const definition = await loadDefinition()
        if (!definition) return null

        if (definition.include) {
            (config.include ?? (config.include = [])).unshift(...definition.include)
        }

        const state = new State(config)
        return state
    }
}