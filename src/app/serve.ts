import { createServer } from "http"
import { join } from "path"
import { stringifyAddress } from "../comTypes/util"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import express = require("express")
import dotenv = require("dotenv")

const context = new DIContext()
const logger = context.provide(Logger, () => new NodeLogger())

const servePath = process.env.SERVE_PATH ? join(process.cwd(), process.env.SERVE_PATH) : process.cwd()
const app = express()
const http = createServer(app)

app.use("/", express.static(servePath))

dotenv.config({ path: join(process.cwd(), ".env.local") })
dotenv.config({ path: join(process.cwd(), ".env") })

const port = process.env.PORT ?? "8080"

http.listen(port, () => {
    logger.info`Listening on ${"http://" + stringifyAddress(http.address())}`
})