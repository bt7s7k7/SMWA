import * as dns from "dns"
import * as http from "http"
import { sign } from "jsonwebtoken"
import * as NodeOSUtils from "node-os-utils"
import { arch, networkInterfaces, release, uptime } from "os"
import { URL } from "url"
import { autoFilter } from "../comTypes/util"
import { DeviceConfig, DeviceContract } from "../common/Device"
import { ClientError } from "../structSync/StructSyncServer"
import { DATABASE } from "./DATABASE"
import { ServiceManager } from "./service/ServiceManager"

export class DeviceController extends DeviceContract.defineController() {
    public services: ServiceManager = null!

    public impl = super.impl({
        setLabel: async ({ label }) => {
            this.mutate(v => v.config.label = label)
            DATABASE.setDirty()
        },
        setDeployPath: async ({ path }) => {
            this.mutate(v => v.config.deployPath = path)
            DATABASE.setDirty()
        },
        setAuthURL: async ({ url }) => {
            if (url != null) {
                try {
                    new URL("", url!)
                } catch (err) {
                    throw new ClientError("Invalid URL")
                }
            }

            this.mutate(v => v.config.authURL = url)
            DATABASE.setDirty()
        },
        authenticate: async ({ service }) => {
            const serviceHandle = this.services.services.get(service)
            if (serviceHandle == null) throw new ClientError("Service does not exist")
            if (serviceHandle.authKey == null) throw new ClientError("Service does not have auth enabled")

            const key = await new Promise<string>((resolve, reject) => sign({
                iss: "smwa"
            }, serviceHandle.authKey!, {
                expiresIn: "10s"
            }, (err, key) => err ? reject(err) : resolve(key!)))

            return key
        }
    })

    public addError(error: string) {
        this.mutate(v => v.errors.push(error))
    }

    public static make(config: DeviceConfig) {
        const interfaces = autoFilter(Object.entries(networkInterfaces()).map(v => v[1]?.map(v => v.address))).filter(v => v != "127.0.0.1" && v != "::1")
        const start = Date.now() - uptime() * 1000
        const device = new DeviceController({
            config, interfaces,
            cpuUsage: 0, memUsage: 0, os: "", errors: [],
            start, time: 0, uptime: uptime()
        })
        // @ts-ignore
        NodeOSUtils.os.oos().then(osName => device.mutate(v => v.os = `${osName} (${arch()}, ${release()})`))
        async function refreshUsageData() {
            const cpuUsage = (await NodeOSUtils.cpu.usage()) / 100
            const { totalMemMb, usedMemMb } = await NodeOSUtils.mem.used()
            const memUsage = usedMemMb / totalMemMb

            device.mutate(device => {
                device.cpuUsage = cpuUsage
                device.memUsage = memUsage
            })

            setTimeout(refreshUsageData, 500)
        }
        refreshUsageData()

        http.get({ host: "api.ipify.org", port: 80, path: "/" }, (res) => {
            res.on("data", (ip) => {
                ip = ip.toString()
                device.mutate(v => v.interfaces.push(ip))
                dns.reverse(ip, (err, hostnames) => {
                    if (hostnames) {
                        device.mutate(v => v.interfaces.push(...hostnames))
                    }
                })
            })

            res.on("error", () => { })
        }).on("error", () => { })

        setInterval(() => {
            device.time++
        }, 1000)

        return device
    }
}
