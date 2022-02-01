import * as dns from "dns"
import * as http from "http"
import * as NodeOSUtils from "node-os-utils"
import { arch, networkInterfaces, release, uptime } from "os"
import { DeviceConfig, DeviceContract } from "../common/Device"
import { autoFilter } from "../comTypes/util"
import { DATABASE } from "./DATABASE"

export class DeviceController extends DeviceContract.defineController() {
    public impl = super.impl({
        setLabel: async ({ label }) => {
            this.mutate(v => v.config.label = label)
            DATABASE.setDirty()
        },
        setDeployPath: async ({ path }) => {
            this.mutate(v => v.config.deployPath = path)
            DATABASE.setDirty()
        }
    })

    public addError(error: string) {
        this.mutate(v => v.errors.push(error))
    }

    public static make(config: DeviceConfig) {
        const interfaces = autoFilter(Object.entries(networkInterfaces()).map(v => v[1]?.map(v => v.address))).filter(v => v != "127.0.0.1" && v != "::1")
        const start = Date.now() - uptime() * 1000
        const device = new DeviceController({
            config, interfaces, start,
            cpuUsage: 0, memUsage: 0, os: "", errors: []
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
        })

        return device
    }
}
