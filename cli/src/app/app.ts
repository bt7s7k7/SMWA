import { writeFile } from "fs/promises"
import { CLI } from "../cli/CLI"
import { State } from "../cli/State"
import { UI } from "../cli/UI"
import { ServiceDefinition } from "../common/Service"

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
        "deploy switch service": {
            desc: "Menu for selecting a different service",
            callback: async () => {
                const state = await State.createFromConfig()
                if (!state) return

                await state.openServiceSelection()
                await state.save()
            }
        },
        init: {
            desc: "Creates a SMWA service config",
            callback: async () => {
                const name = await UI.prompt("Enter project name:")
                if (!name) return

                const definition = new ServiceDefinition({
                    name,
                    scripts: {
                        start: "echo hello world!"
                    }
                })

                await writeFile("./smwa.json", JSON.stringify(definition.serialize(), null, 4))
            }
        }
    })

    cli.run(process.argv.slice(2))
}().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
})