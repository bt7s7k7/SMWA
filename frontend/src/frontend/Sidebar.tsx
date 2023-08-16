import { mdiAlert, mdiCalendarText, mdiCog, mdiCogStop, mdiCogSync, mdiPlus, mdiRobot, mdiServer } from "@mdi/js"
import { computed, defineComponent } from "vue"
import { useRouter } from "vue-router"
import { asError, autoFilter, unreachable } from "../comTypes/util"
import { Button } from "../vue3gui/Button"
import { useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"
import { stringifyError } from "../vue3gui/util"
import { Variant } from "../vue3gui/variants"
import { STATE } from "./State"
import { ServiceCreatorPopup } from "./service/ServiceCreatorPopup"

type Item = { to?: string, onClick?: () => void, label: string, icon: string, variant?: Variant } | "separator"

export const Sidebar = (defineComponent({
    name: "Sidebar",
    props: {
        fullPageMode: { type: Boolean }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()
        const router = useRouter()

        const items = computed(() => autoFilter<Item>([
            { to: "/", label: "Device", icon: mdiServer },
            { to: "/machine-access", label: "Machine Access", icon: mdiRobot },
            { to: "/event-log", label: "Event Log", icon: mdiCalendarText },
            "separator",

            STATE.services.serviceList.map(v => ({
                label: v.label, to: "/service/" + v.id,
                ...(
                    v.state == "error" ? { icon: mdiAlert, variant: "danger" } :
                        v.state == "updating" ? { icon: mdiCogSync } :
                            v.state == "stopped" ? { icon: mdiCogStop } :
                                v.state == "running" ? { icon: mdiCog } : unreachable()
                )
            })),

            { icon: mdiPlus, label: "Add service", onClick: addService }
        ]))

        async function addService() {
            const serviceInfo = await emitter.genericModal(ServiceCreatorPopup, { props: { cancelButton: true, okButton: "Create" } })
            if (serviceInfo) {
                const work = emitter.work("Creating service...")
                const result = await STATE.services.createService(serviceInfo).catch(asError)
                work.done()
                if (result instanceof Error) {
                    emitter.alert(stringifyError(result), { error: true })
                } else {
                    router.push("/service/" + result)
                }
            }
        }

        return () => {
            const itemsVNodes = items.value.map(v => (
                v == "separator" ? <div class="m-2 border-bottom"></div>
                    : <Button replace={props.fullPageMode} class={`text-left text-${v.variant ?? "black"}`} onClick={v.onClick} clear to={v.to}> <Icon icon={v.icon} /> {v.label} </Button>
            ))

            if (!props.fullPageMode) {
                return (
                    <div>
                        <div class="absolute-fill flex column scroll py-2">
                            {itemsVNodes}
                        </div>
                    </div>
                )
            } else {
                return (
                    <div class="py-2 flex column w-fill">{itemsVNodes}</div>
                )
            }

        }
    }
}))
