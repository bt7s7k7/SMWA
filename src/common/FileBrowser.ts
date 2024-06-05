import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class DirentInfo extends Struct.define("DirentInfo", {
    name: Type.string,
    type: Type.enum("file", "directory", "other")
}) { }

export const FileBrowserContract = StructSyncContract.define(class FileBrowser extends Struct.define("FileBrowser", {
    homedir: Type.string
}) { }, {
    listDirectory: ActionType.define("listDirectory", Type.object({ path: Type.string }), DirentInfo.ref().as(Type.array)),
    deleteEntry: ActionType.define("deleteEntry", Type.object({ path: Type.string }), Type.empty),
    mkdir: ActionType.define("mkdir", Type.object({ path: Type.string, name: Type.string }), Type.empty)
})
