import { join } from "path"
import { Type } from "../struct/Type"
import dotenv = require("dotenv")

const Env_t = Type.namedType("env", {
    PORT: Type.string,
    DB_PATH: Type.string
})

dotenv.config({ path: join(__dirname, "../../.env.local") })
dotenv.config({ path: join(__dirname, "../../.env") })

export const ENV = Env_t.deserialize(process.env)