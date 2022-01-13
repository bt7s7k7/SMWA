import { mkdir, readdir, rm } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { DirentInfo, FileBrowserContract } from "../common/FileBrowser"
import { asError } from "../comTypes/util"
import { ClientError } from "../structSync/StructSyncServer"

export class FileBrowserController extends FileBrowserContract.defineController() {
    public impl = super.impl({
        listDirectory: async ({ path }) => {
            const result = await readdir(path, { withFileTypes: true }).catch(asError)
            if (result instanceof Error) {
                throw new ClientError("Cannot open directory")
            }

            return result.map(v => new DirentInfo({ name: v.name, type: v.isDirectory() ? "directory" : "file" }))
        },
        deleteEntry: async ({ path }) => {
            const result = await rm(path, { recursive: true }).catch(asError)
            if (result instanceof Error) {
                throw new ClientError("Cannot delete this file")
            }
        },
        mkdir: async ({ name, path }) => {
            const fullPath = join(path, name)
            const result = await mkdir(fullPath).catch(asError)
            if (result instanceof Error) {
                if (result.code == "EEXIST") throw new ClientError("Folder already exists")
                else if (result.code == "ENOENT") throw new ClientError("Invalid path")
                else throw result
            }
        }
    })

    public static make() {
        return new FileBrowserController({ homedir: homedir() })
    }
}