import { computed, defineComponent } from "vue"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { STATE } from "../State"
import { LoginScreen } from "./LoginScreen"

export const ConnectionGuard = (defineComponent({
    name: "ConnectionGuard",
    setup(props, ctx) {
        const loading = computed(() => !STATE.authReady || (STATE.auth.user != null && !STATE.connected))

        return () => (
            <Overlay show={loading.value} variant="white">{{
                overlay: () => <LoadingIndicator />,
                default: () => (
                    STATE.authReady && (STATE.auth.user == null ? (
                        <LoginScreen />
                    ) : (
                        // @ts-ignore
                        <ctx.slots.default />
                    ))
                )
            }}</Overlay>
        )
    }
}))