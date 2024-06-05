/// <reference path="./.vscode/config.d.ts" />

const { spawnSync } = require("child_process")
const { writeFile } = require("fs/promises")
const { userInfo } = require("os")
const { join } = require("path")
const { project, include, github, log, constants, copy } = require("ucpem")

include("frontend/ucpem.js")
include("cli/ucpem.js")

project.prefix("src").res("common",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/SimpleServer").res("simpleAuth"),
)

project.prefix("src").res("backend",
    project.ref("common"),
    github("bt7s7k7/Struct").res("structSyncExpress"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    github("bt7s7k7/SimpleServer").res("simpleDB"),
    github("bt7s7k7/AdminGUI").res("adminUIBridge")
)

project.script("make-systemd-unit", async () => {
    await writeFile("./smwa.service", [
        `[Unit]`,
        `Description=SMWA`,
        ``,
        `[Service]`,
        `Environment=NODE_VERSION=20`,
        `ExecStart=${join(process.env.NVM_DIR, "nvm-exec")} ${join(constants.projectPath, "build/index.js")}`,
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

project.script("esbuild", async () => {
    const { build } = require("esbuild")

    await build({
        bundle: true,
        format: "cjs",
        entryPoints: ["./src/index.ts"],
        outfile: "dist/index.js",
        sourcemap: "external",
        external: [
            "node-pty"
        ],
        logLevel: "info",
        platform: "node",
        preserveSymlinks: true
    })

    await copy(join(constants.projectPath, "frontend/dist"), join(constants.projectPath, "dist/frontend/dist"), { quiet: true })
    await writeFile(join(constants.projectPath, "dist/package.json"), JSON.stringify({
        name: "smwa",
        main: "index.js",
        private: true,
        dependencies: {
            "node-pty": "^0.10.1"
        }
    }, null, 4))
})

project.script("smwa-cli", async (args) => {
    spawnSync("node", [join(constants.projectPath, "cli/build/app/app.js"), ...args], { stdio: "inherit", shell: true })
}, { argc: NaN, desc: "Runs the SMWA CLI tool" })
