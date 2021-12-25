import { defineComponent } from "vue"
import { ConnectionGuard } from "../frontend/auth/ConnectionGuard"
import { UserView } from "../frontend/auth/UserView"
import { STATE } from "../frontend/State"
import "../frontend/style.scss"
import { DynamicsEmitter } from "../vue3gui/DynamicsEmitter"

export const App = defineComponent({
    name: "App",
    setup(props, ctx) {
        return () => (
            <DynamicsEmitter>
                <ConnectionGuard class="flex-fill flex column">
                    <div class="border-bottom flex row p-2 gap-2 center-cross">
                        <div>{STATE.device?.config.label}</div>
                        <div class="flex-fill" />
                        <UserView />
                    </div>
                    <div class="flex-fill flex row">
                        <div class="flex-basis-200 border-right"></div>
                        <router-view />
                    </div>
                </ConnectionGuard>
            </DynamicsEmitter>
        )
    }
})