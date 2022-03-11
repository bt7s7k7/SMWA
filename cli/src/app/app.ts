import AdmZip from "adm-zip"
import { fdir } from "fdir"
import fileSize from "file-size"
import { readFile, writeFile } from "fs/promises"
import { CLI } from "../cli/CLI"
import { State } from "../cli/State"
import { UI } from "../cli/UI"
import { ServiceDefinition } from "../common/Service"

process.on("SIGINT", function () {
    process.exit(0)
})

async function deploy(dry: boolean) {
    const state = await State.createFromConfig()
    if (!state) return

    const crawler = new fdir()
        .withRelativePaths()
        .withSymlinks()

    if (state.config.include) {
        crawler.glob(...state.config.include)
    }

    const files = (await crawler.crawl(process.cwd()).withPromise()) as string[]
    UI.success(`Found ${files.length} files to upload`)

    const zipProgress = UI.indeterminateProgress("Packaging files...")
    const zip = new AdmZip()
    const queue: Promise<void>[] = []
    for (const file of files) {
        queue.push((async () => {
            const content = await readFile(file)
            zip.addFile(file, content)
        })())
    }
    await Promise.all(queue)
    const zipData = zip.toBuffer()
    zipProgress.done()

    UI.success(`Upload size: ${fileSize(zipData.byteLength).human("si")}`)

    if (dry) {
        console.log(files)
        return
    }

    await state.deploy(zipData)
}

void async function () {
    const cli = new CLI("smwa", {
        "deploy init": {
            desc: "Initializes a new project in this directory",
            callback: async () => {
                const state = await State.createFromUserInput()
                if (!state) return

                await state.save()
                UI.success("Deploy file successfully created")
            }
        },
        "deploy info": {
            desc: "Fetches device info from the server",
            callback: async () => {
                const state = await State.createFromConfig()
                if (!state) return

                await state.printInfo()
            }
        },
        "deploy switch": {
            desc: "Menu for selecting a different service",
            callback: async () => {
                const state = await State.createFromConfig()
                if (!state) return

                const prevService = state.config.service

                await state.openServiceSelection()

                if (prevService != state.config.service) {
                    await state.printInfo()
                }

                await state.save()
            }
        },
        "deploy dry": {
            desc: "Performs deployment steps without uploading",
            callback: async () => {
                await deploy(true)
            }
        },
        deploy: {
            desc: "Deploys files to the server",
            callback: async () => {
                await deploy(false)
            }
        },
        "deploy env set": {
            desc: "Sets environment variable in service :: Arguments: <key> <value>",
            callback: async ([key, value]) => {
                const state = await State.createFromConfig()
                if (!state) return

                if (await state.changeEnvVariable({ key, value })) UI.success("Variable set")
            },
            argc: 2
        },
        "deploy env delete": {
            desc: "Removes environment variable in service :: Arguments: <key>",
            callback: async ([key]) => {
                const state = await State.createFromConfig()
                if (!state) return

                if (await state.changeEnvVariable({ key })) UI.success("Variable removed")
            },
            argc: 1
        },
        "deploy env rename": {
            desc: "Renames environment variable in service :: Arguments: <key> <new key>",
            callback: async ([replace, key]) => {
                const state = await State.createFromConfig()
                if (!state) return

                if (await state.changeEnvVariable({ key, replace })) UI.success("Variable renamed")
            },
            argc: 1
        },
        "deploy env": {
            desc: "Prints environment variables in service",
            callback: async () => {
                const state = await State.createFromConfig()
                if (!state) return

                await state.printServiceEnv()
            }
        },
        init: {
            desc: "Creates a SMWA service config",
            callback: async () => {
                const name = await UI.prompt("Enter project name:")
                if (!name) return

                const definition = new ServiceDefinition({
                    name
                })

                const definitionData = definition.serialize()

                delete definitionData.scripts
                delete definitionData.servePath

                const data = {
                    $schema: "https://raw.githubusercontent.com/bt7s7k7/SMWA/master/schema.json",
                    ...definitionData
                }

                await writeFile("./smwa.json", JSON.stringify(data, null, 4))
            }
        }
    })

    await cli.run(process.argv.slice(2))
    process.exit(0)
}().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
})