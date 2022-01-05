import { mdiCogs, mdiPlay, mdiStop, mdiUpdate } from "@mdi/js"
import { computed, defineComponent, ref, watch } from "vue"
import { unreachable } from "../../comTypes/util"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { Tabs, useTabs } from "../../vue3gui/Tabs"
import { TextField } from "../../vue3gui/TextField"
import { stringifyError } from "../../vue3gui/util"
import { DirectAccessButtons } from "../DirectAccessButtons"
import { STATE } from "../State"
import { TerminalView } from "../terminal/TerminalView"
import { formatTime } from "../util"
import { ServiceProxy } from "./ServiceProxy"

export const ServiceView = (defineComponent({
    name: "ServiceView",
    props: {
        service: { type: ServiceProxy, required: true }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const labelElement = ref<HTMLElement>()
        async function showNamePopup() {
            const newLabel = ref(props.service.config.label)

            const popup = emitter.popup(labelElement.value!, () => (
                <form onSubmit={event => { event.preventDefault(); popup.controller.close(true) }}>
                    <TextField vModel={newLabel.value} focus class="w-200" />
                </form>
            ), {
                align: "over",
                props: {
                    cancelButton: false,
                    backdropCancels: true
                },
                contentProps: {
                    class: "rounded p-2 shadow"
                }
            })

            if (await popup) {
                if (newLabel.value != props.service.config.label) {
                    props.service.setLabel({ label: newLabel.value })
                }
            }
        }

        function startService() {
            props.service.start().catch(err => {
                emitter.alert(stringifyError(err), { error: true })
            })
        }

        function stopService() {
            props.service.stop().catch(err => {
                emitter.alert(stringifyError(err), { error: true })
            })
        }

        function updateService() {
            props.service.update().catch(err => {
                emitter.alert(stringifyError(err), { error: true })
            })
        }

        const formattedUptime = computed(() => {
            if (props.service.uptime == null) return "None"
            const uptime = props.service.state == "running" || props.service.state == "updating" ? STATE.time - props.service.uptime : props.service.uptime
            return formatTime(uptime)
        })

        const schedulerConfig = useTabs({
            "disabled": "Disabled",
            "autostart": "Autostart"
        })

        watch(() => props.service, (service) => {
            schedulerConfig.selected = service.config.scheduler
        }, { immediate: true })

        watch(() => schedulerConfig.selected, (scheduler) => {
            if (scheduler != props.service.config.scheduler) {
                props.service.setScheduler({ scheduler })
            }
        })

        return () => (
            <div class="flex-fill">
                <div class="absolute-fill scroll flex column p-2 gap-2">
                    <div class="border rounded p-2 flex row">
                        <div>
                            <h1 class="m-0">
                                <Icon icon={mdiCogs} />
                                <Button clear ref={labelElement} onClick={showNamePopup} class="h1">
                                    <h1 class="m-0">{props.service.config.label}</h1>
                                </Button>
                            </h1>
                            <div class="pl-1 muted small monospace">{props.service.definition.name} ({props.service.config.id})</div>
                        </div>
                        <div>
                            <DirectAccessButtons path={props.service.config.path} />
                        </div>
                    </div>
                    <div class="border rounded p-2 gap-10 flex row">
                        <div class="flex column">
                            <div>{
                                props.service.state == "stopped" ? (
                                    <><Button clear onClick={startService}> <Icon icon={mdiPlay} /> </Button> <span class="text-danger monospace">STOPPED</span></>
                                ) : props.service.state == "error" ? (
                                    <><Button clear onClick={startService}> <Icon icon={mdiPlay} /> </Button> <span class="text-danger monospace">ERROR</span></>
                                ) : props.service.state == "running" ? (
                                    <><Button clear onClick={stopService}> <Icon icon={mdiStop} /> </Button> <span class="text-success monospace">RUNNING</span></>
                                ) : props.service.state == "updating" ? (
                                    <><Button clear onClick={stopService}> <Icon icon={mdiStop} /> </Button> <span class="text-primary monospace">UPDATING</span></>
                                ) : unreachable()
                            }</div>
                            <Button clear onClick={updateService} disabled={props.service.state == "updating" || !props.service.definition.scripts.update} class="text-left"> <Icon icon={mdiUpdate} /> Update</Button>
                        </div>
                        <div class="flex column">
                            <small class="muted">Uptime</small>
                            <div>{formattedUptime.value}</div>
                        </div>
                        <div class="flex column">
                            <small class="muted">Scheduler</small>
                            <Tabs tabs={schedulerConfig} />
                        </div>
                    </div>
                    {props.service.terminal && <div class="border rounded p-2 gap-2 flex row" key="terminal">
                        <TerminalView id={props.service.terminal} />
                    </div>}
                </div>
            </div>
        )
    }
}))