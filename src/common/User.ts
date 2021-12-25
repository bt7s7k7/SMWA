import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"

export class User extends Struct.define("User", {
    id: Type.string,
    password: Type.string,
    salt: Type.string
}) { }
