import { mdiConsole, mdiFolderOutline } from "@mdi/js"
import { defineComponent } from "vue"
import { makeRandomID } from "../comTypes/util"
import { Button } from "../vue3gui/Button"
import { useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"
import { FileBrowserView } from "./file/FileBrowserView"
import { PersonalTerminalView } from "./terminal/PersonalTerminalView"

export const DirectAccessButtons = (defineComponent({
    name: "DirectAccessButtons",
    props: {
        path: { type: String }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function showPersonalTerminal(event: MouseEvent) {
            if (event.button == 0) {
                emitter.modal(PersonalTerminalView, {
                    props: { noTransition: true, cancelButton: "Close" },
                    contentProps: { cwd: props.path }
                })
            } else if (event.button == 1) {
                window.open("/terminal", makeRandomID(), [
                    "menubar=no",
                    "location=no",
                    "resizable=yes",
                    "scrollbars=yes",
                    "status=yes",
                    "width=1146",
                    "height=851",
                    "left=" + Math.floor(window.innerWidth / 2 - (1146 / 2)),
                    "top=" + Math.floor(window.innerHeight / 2 - (851 / 2))
                ].join(","))
            }
        }

        function showFileBrowser() {
            emitter.modal(FileBrowserView, {
                props: { cancelButton: "Close" },
                contentProps: { class: "w-500 h-500", initialPath: props.path }
            })
        }

        return () => (
            <>
                <Button clear onClick={showFileBrowser}> <Icon icon={mdiFolderOutline} /> </Button>
                <Button clear onMouseDown={showPersonalTerminal}> <Icon icon={mdiConsole} /> </Button>
            </>
        )
    }
}))