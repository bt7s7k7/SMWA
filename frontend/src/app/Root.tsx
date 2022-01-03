import { mdiConsole, mdiFolderOutline } from "@mdi/js"
import { defineComponent } from "vue"
import { makeRandomID } from "../comTypes/util"
import { UserView } from "../frontend/auth/UserView"
import { DirectAccessButtons } from "../frontend/DirectAccessButtons"
import { FileBrowserView } from "../frontend/file/FileBrowserView"
import { Sidebar } from "../frontend/Sidebar"
import { STATE } from "../frontend/State"
import "../frontend/style.scss"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { Button } from "../vue3gui/Button"
import { DynamicsEmitter, useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"

export const Root = defineComponent({
    name: "Root",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        return () => (
            <div class="flex-fill flex column">
                <div class="border-bottom flex row p-2 gap-2 center-cross">
                    <div>{STATE.device?.config.label}</div>
                    <div>
                        <DirectAccessButtons />
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