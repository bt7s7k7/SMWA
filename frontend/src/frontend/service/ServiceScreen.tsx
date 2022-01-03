import { computed, defineComponent, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { asError } from "../../comTypes/util"
import { DISPOSE } from "../../eventLib/Disposable"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { StateCard } from "../../vue3gui/StateCard"
import { asyncComputed, stringifyError } from "../../vue3gui/util"
import { STATE } from "../State"
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

        const serviceError = asyncComputed(() => [serviceID.value, service.error] as const, async ([id, error]) => {
            if (!error || !stringifyError(error).includes("Server Error: No controller named")) return null

            const text = await STATE.services.getServiceError({ id })
            if (!text) return null
            if (text.startsWith("Missing definition file for service")) {
                return "Missing definition file for service\n" + text.match(/at ((?:.|\n)*)$/)![0]
            }

            if (text.startsWith("Failed to load definition for")) {
                return "Failed to load definition\n" + text.match(/\):\s*((?:.|\n)*)$/)![1]
            }

            return text
        })

        onUnmounted(() => {
            service.value?.[DISPOSE]
        })

        async function deleteService() {
            const work = emitter.work("Deleting...")
            const result = await STATE.services.deleteService({ id: serviceID.value }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            } else {
                router.push("/")
            }
        }

        return () => (
            <Overlay noTransition show={service.loading || serviceError.loading} variant="white" class="flex-fill flex column">{{
                overlay: () => <LoadingIndicator />,
                default: () => (
                    service.error ? (
                        <div class="flex-fill flex center">
                            <div class="border border-danger rounded text-danger p-2">
                                {serviceError.value ? (
                                    <div class="flex column gap-4">
                                        <div class="flex row">
                                            <StateCard error class="flex-basis-8"></StateCard>
                                            <pre class="mr-10 my-0">{serviceError.value}</pre>
                                        </div>
                                        <div class="flex row">
                                            <div class="flex-fill"></div>
                                            <Button onClick={deleteService} variant="danger">Delete service</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <StateCard error>{stringifyError(service.error)}</StateCard>
                                )}
                            </div>
                        </div>
                    ) : service.value && (
                        <ServiceView service={service.value} />
                    )
                )
            }}</Overlay>
        )
    }
}))