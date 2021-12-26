import { defineComponent } from "vue"
import { ConnectionGuard } from "../frontend/auth/ConnectionGuard"
import "../frontend/style.scss"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { DynamicsEmitter, useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"

export const App = defineComponent({
    name: "App",
    setup(props, ctx) {

        return () => (
            <DynamicsEmitter>
                <ConnectionGuard class="flex-fill flex column">
                    <router-view />
                </ConnectionGuard>
            </DynamicsEmitter>
        )
    }
})