import { mdiConsole, mdiFolderOutline } from "@mdi/js"
import { defineComponent } from "vue"
import { makeRandomID } from "../comTypes/util"
import { UserView } from "../frontend/auth/UserView"
import { FileBrowserView } from "../frontend/file/FileBrowserView"
import { Sidebar } from "../frontend/Sidebar"
import { STATE } from "../frontend/State"
import "../frontend/style.scss"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { Button } from "../vue3gui/Button"
import { useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"

export const Root = defineComponent({
    name: "Root",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function showPersonalTerminal(event: MouseEvent) {
            if (event.button == 0) {
                emitter.modal(PersonalTerminalView, {
                    props: { noTransition: true, cancelButton: "Close" }
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
                contentProps: { class: "w-500 h-500" }
            })
        }

        return () => (
            <div class="flex-fill flex column">
                <div class="border-bottom flex row p-2 gap-2 center-cross">
                    <div>{STATE.device?.config.label}</div>
                    <div>
                        <Button clear onMouseDown={showPersonalTerminal}> <Icon icon={mdiConsole} /> </Button>
                        <Button clear onClick={showFileBrowser}> <Icon icon={mdiFolderOutline} /> </Button>
                    </div>
                    <div class="flex-fill" />
                    <UserView />
                </div>
                <div class="flex-fill flex row">
                    <Sidebar class="flex-basis-200 border-right"></Sidebar>
                    <router-view />
                </div>
            </div>
        )
    }
})