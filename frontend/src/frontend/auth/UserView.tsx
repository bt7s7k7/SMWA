import { mdiAccount } from "@mdi/js"
import { ComponentPublicInstance, computed, defineComponent, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { STATE } from "../State"

export const UserView = (defineComponent({
    name: "UserView",
    setup(props, ctx) {
        const userButton = ref<ComponentPublicInstance>()
        const emitter = useDynamicsEmitter()
        const user = computed(() => STATE.auth.user!)

        async function showUserMenu() {
            const popup = emitter.popup(userButton.value!.$el, () => <>
                <small> <Icon icon={mdiAccount} /> {user.value.id} </small>
                <div class="border-bottom my-2"></div>
                <Button class="text-left" onClick={() => { popup.controller.close(); STATE.auth.logout() }} clear>Sign&nbsp;Out</Button>
            </>, {
                props: {
                    class: "border rounded shadow",
                    cancelButton: false,
                    backdropCancels: true,
                },
                align: "bottom-left"
            })
        }

        return () => (
            <div class="flex row gap-2 center-cross">
                <Button clear onClick={showUserMenu} ref={userButton}> <Icon icon={mdiAccount} /> {user.value.id} </Button>
            </div>
        )
    }
}))