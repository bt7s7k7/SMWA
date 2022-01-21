import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { AccessToken } from "../common/AccessToken"
import { DeviceConfig } from "../common/Device"
import { ServiceConfig } from "../common/Service"
import { User } from "../common/User"
import { SimpleDB } from "../simpleDB/SimpleDB"
import { ENV } from "./ENV"

export const DATABASE = new SimpleDB({
    tables: {
        user: User,
        device: DeviceConfig,
        service: ServiceConfig,
        token: AccessToken
    },
    onChanged() {
        writeFileSync(DB_PATH, JSON.stringify(DATABASE.export()))
    }
})

const DB_PATH = join(process.cwd(), ENV.DB_PATH)
try {
    const data = readFileSync(DB_PATH).toString()
    DATABASE.import(JSON.parse(data))
} catch (err: any) {
    if (err.code != "ENOENT") throw err
}

