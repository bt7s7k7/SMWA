import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"

export class Config extends Struct.define("Config", {
    url: Type.string,
    token: Type.string,
    service: Type.string.as(Type.nullable),
    include: Type.string.as(Type.array).as(Type.nullable)
}) { }

export const CONFIG_FILE = process.env.SMWA_CFG ?? "./smwa-deploy.json"
