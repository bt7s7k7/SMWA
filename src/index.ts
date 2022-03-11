#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from "child_process"
import { writeFileSync } from "fs"
import { userInfo } from "os"
import { join } from "path"
import { createInterface } from "readline"

if (process.argv[2]) {
    const rl = createInterface(process.stdin, process.stdout)
    const lineReader = rl[Symbol.asyncIterator]()
    async function readLine(): Promise<string> {
        return (await lineReader.next()).value ?? ""
    }

    void async function () {
        function abort(message: string): never {
            console.error(message)
            process.exit(1)
        }

        async function confirm(message: string): Promise<boolean> {
            process.stdout.write(message + " [Y/n]: ")
            const result = await readLine()
            const answer = result.toLowerCase()[0]
            if (answer == "y" || answer == undefined) {
                return true
            } else if (answer == "n") {
                return false
            } else {
                return await confirm(message)
            }
        }

        const command = process.argv[2]
        if (command == "install") {
            const duplicateCheck = spawnSync("sudo", ["systemctl", "status", "smwa", "--no-pager"], { stdio: "inherit", shell: true })
            if (duplicateCheck.status == 0) {
                console.log("There is an installed version of this application")
                if (!await confirm("Do you want to overwrite it?")) {
                    process.exit(1)
                }
            }

            if (!process.env.NVM_DIR) abort("Cannot find NVM_DIR to create service")

            const unit = [
                `[Unit]`,
                `Description=SMWA`,
                ``,
                `[Service]`,
                `Environment=NODE_VERSION=16`,
                `ExecStart=${join(process.env.NVM_DIR, "nvm-exec")} ${join(__dirname, "index.js")}`,
                `WorkingDirectory=${__dirname}`,
                `LimitNOFILE=4096`,
                `IgnoreSIGPIPE=false`,
                `KillMode=control-group`,
                `User=${userInfo().username}`,
                `Restart=on-success`,
                ``,
                `[Install]`,
                `WantedBy=multi-user.target`,
            ].join("\n")

            writeFileSync("./smwa.service", unit)

            spawnSync("sudo", ["cp", "./smwa.service", "/etc/systemd/system/smwa.service"], { stdio: "inherit", shell: true })
            spawnSync("sudo", ["systemctl", "status", "smwa", "--no-pager"], { stdio: "inherit", shell: true })
        } else if (command == "serve") {
            require("./app/serve")
        } else {
            abort(`Invalid command`)
        }
    }().catch(err => {
        console.error(err)
        process.exit(1)
    })
} else {
    require("./app/app")
}
