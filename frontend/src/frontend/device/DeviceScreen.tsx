import { mdiServer } from "@mdi/js"
import { defineComponent, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { Circle } from "../../vue3gui/Circle"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { StateCard } from "../../vue3gui/StateCard"
import { TextField } from "../../vue3gui/TextField"
import { UsersView } from "../auth/UsersView"
import { STATE } from "../State"
import { useTitle } from "../useTitle"
import { formatDate, formatTime } from "../util"

export const DeviceScreen = (defineComponent({
    name: "DeviceScreen",
    setup(props, ctx) {
        useTitle()

        const emitter = useDynamicsEmitter()

        const labelElement = ref<HTMLElement>()

        async function showNamePopup() {
            const newLabel = ref(STATE.device.config.label)

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
                if (newLabel.value != STATE.device.config.label) {
                    STATE.device.setLabel({ label: newLabel.value })
                }
            }
        }

        return () => (
            <div class="flex-fill">
                <div class="absolute-fill scroll flex column p-2 gap-2">
                    <div class="border rounded p-2 gap-2">
                        <h1 class="m-0">
                            <Icon icon={mdiServer} />
                            <Button clear ref={labelElement} onClick={showNamePopup} class="h1">
                                <h1 class="m-0">{STATE.device.config.label}</h1>
                            </Button>
                        </h1>
                        <div class="pl-1 muted small monospace">{STATE.device.os}</div>
                        <div class="flex row p-2 gap-10">
                            <div class="flex center">
                                <Circle variant="primary" filler progress={STATE.device.cpuUsage} />
                                <div class="absolute-fill flex center column pb-5">
                                    <h1>{Math.floor(STATE.device.cpuUsage * 100).toString()}%</h1>
                                    <div>CPU Usage</div>
                                </div>
                            </div>
                            <div class="flex center">
                                <Circle variant="warning" filler progress={STATE.device.memUsage} />
                                <div class="absolute-fill flex center column pb-5">
                                    <h1>{Math.floor(STATE.device.memUsage * 100).toString()}%</h1>
                                    <div>RAM Usage</div>
                                </div>
                            </div>
                            <div class="flex column gap-2">
                                <div class="flex column">
                                    <small class="muted">Uptime</small>
                                    <div>{formatTime(STATE.time - STATE.device.start)}</div>
                                </div>
                                <div class="flex column">
                                    <small class="muted">Boot</small>
                                    <div>{formatDate(STATE.device.start)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {STATE.device.errors.map(v => (
                        <div class="border border-danger text-danger rounded p-2 gap-2 flex row">
                            <StateCard error />
                            <pre class="m-0 ml-5 mt-1">{v}</pre>
                        </div>
                    ))}

                    <UsersView class="border rounded p-2" />
                </div>
            </div>
        )
    }
}))