import { join } from "path"
import { Type } from "../struct/Type"
import dotenv = require("dotenv")

// Change the base directory based on if we are bundled with esbuild or not
const BASE_DIR = __filename.endsWith("index.js") ? __dirname : join(__dirname, "../..")

const Env_t = Type.namedType("env", {
    PORT: Type.string,
    DB_PATH: Type.string
})

dotenv.config({ path: join(BASE_DIR, ".env.local") })
dotenv.config({ path: join(BASE_DIR, ".env") })

export const ENV = { ...Env_t.deserialize(process.env), BASE_DIR }
