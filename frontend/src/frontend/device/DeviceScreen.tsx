import { mdiServer } from "@mdi/js"
import { defineComponent, onUnmounted, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { Circle } from "../../vue3gui/Circle"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TextField } from "../../vue3gui/TextField"
import { STATE } from "../State"
import { PersonalTerminalView } from "../terminal/PersonalTerminalView"

export const DeviceScreen = (defineComponent({
    name: "DeviceScreen",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const time = ref(Date.now())
        const _1 = setInterval(() => {
            time.value = Date.now()
        }, 1000)
        onUnmounted(() => clearInterval(_1))

        const labelElement = ref<HTMLElement>()

        function formatTime(time: number) {
            time /= 1000

            const hours = Math.floor(time / 3600)
            time -= hours * 3600
            const minutes = Math.floor(time / 60)
            time -= minutes * 60
            const seconds = Math.floor(time)

            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        }

        function formatDate(time: number) {
            const date = new Date(time)
            return [`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate() + 1}`, <br />, `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`]
        }

        async function showNamePopup() {
            const newLabel = ref(STATE.device.config.label)

            const popup = await emitter.popup(labelElement.value!, () => (
                <form>
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

            if (popup) {
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
                                    <div>{formatTime(time.value - STATE.device.start)}</div>
                                </div>
                                <div class="flex column">
                                    <small class="muted">Boot</small>
                                    <div>{formatDate(STATE.device.start)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}))