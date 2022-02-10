import { computed, defineComponent, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { DISPOSE } from "../../eventLib/Disposable"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { asyncComputed } from "../../vue3gui/util"
import { STATE } from "../State"
import { useTitle } from "../useTitle"
import { ServiceProxy } from "./ServiceProxy"
import { ServiceView } from "./ServiceView"

export const ServiceScreen = (defineComponent({
    name: "ServiceScreen",
    setup(props, ctx) {
        const route = useRoute()
        const router = useRouter()
        const emitter = useDynamicsEmitter()

        const serviceID = computed(() => route.params.service as string)
        const service = asyncComputed(() => serviceID.value, async id => id ? await ServiceProxy.make(STATE.connectionContext!, { track: true, id }) : null, {
            finalizer: v => v?.[DISPOSE]()
        })

        useTitle(computed(() => service.value?.config.label ?? "Service"))

        onUnmounted(() => {
            service.value?.[DISPOSE]
        })

        return () => (
            <Overlay noTransition show={service.loading} variant="white" class="flex-fill flex column">{{
                overlay: () => <LoadingIndicator />,
                default: () => (
                    service.value ? (
                        <ServiceView service={service.value} />
                    ) : (
                        <pre class="m-2">Service not found</pre>
                    )
                )
            }}</Overlay>
        )
    }
}))