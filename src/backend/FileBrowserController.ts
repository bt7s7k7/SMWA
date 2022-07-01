import { mkdir, readdir, rm } from "fs/promises"
import { homedir } from "os"
import { join } from "path"
import { DirentInfo, FileBrowserContract } from "../common/FileBrowser"
import { asError } from "../comTypes/util"
import { ClientError } from "../structSync/StructSyncServer"

let driveLetters: DirentInfo[] | null = null
async function findDriveLetters() {
    driveLetters = []
    const possibleLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for (const letter of possibleLetters) {
        readdir(letter + ":\\").then(() => {
            driveLetters!.push(new DirentInfo({ name: letter + ":", type: "directory" }))
        }, err => {
            if (err.code != "ENOENT") throw err
        })
    }
}

export class FileBrowserController extends FileBrowserContract.defineController() {
    public impl = super.impl({
        listDirectory: async ({ path }) => {
            if (driveLetters && path == "/") {
                return driveLetters
            }

            if (driveLetters && path[0] == "/") {
                path = path.slice(1)
            }

            if (driveLetters && path.match(/^[A-Z]:$/)) {
                path = path + "/"
            }

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
        let home = homedir()
        if (home.match(/^[A-Z]:\\/)) {
            home = "/" + home.replace(/\\/g, "/")
            findDriveLetters()
        }

        return new FileBrowserController({ homedir: home })
    }
}