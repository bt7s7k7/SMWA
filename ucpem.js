/// <reference path="./.vscode/config.d.ts" />

const { writeFile } = require("fs/promises")
const { userInfo } = require("os")
const { join } = require("path")
const { project, include, github, log, constants } = require("ucpem")

include("frontend/ucpem.js")

project.prefix("src").res("common",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/SimpleServer").res("simpleAuth"),
)

project.prefix("src").res("backend",
    project.ref("common"),
    github("bt7s7k7/Struct").res("structSyncExpress"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    github("bt7s7k7/SimpleServer").res("simpleDB"),
)

project.script("make-systemd-unit", async () => {
    await writeFile("./smwa.service", [
        `[Unit]`,
        `Description=SMWA`,
        ``,
        `[Service]`,
        `Environment=NODE_VERSION=16`,
        `ExecStart=${join(process.env.NVM_DIR, "nvm-exec")} ${join(constants.projectPath, "build/app/app.js")}`,
        `WorkingDirectory=${constants.projectPath}`,
        `LimitNOFILE=4096`,
        `IgnoreSIGPIPE=false`,
        `KillMode=control-group`,
        `User=${userInfo().username}`,
        `Restart=on-success`,
        ``,
        `[Install]`,
        `WantedBy=multi-user.target`,
    ].join("\n"))

    log(`Run "sudo cp ./smwa.service /etc/systemd/system/smwa.service" to install`)
})