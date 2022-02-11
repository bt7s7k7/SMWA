import { mdiPlus, mdiTrashCan } from "@mdi/js"
import { defineComponent, ref } from "vue"
import { asError } from "../../comTypes/util"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TextField } from "../../vue3gui/TextField"
import { stringifyError } from "../../vue3gui/util"
import { ServiceProxy } from "./ServiceProxy"

export const ServiceEnvPopup = (defineComponent({
    name: "ServiceEnvPopup",
    props: {
        service: { type: ServiceProxy, required: true }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function makeField(event: MouseEvent, initialValue?: string) {
            const value = ref(initialValue ?? "")
            const target = event.target as HTMLElement
            const popup = emitter.popup(target, () => (
                <form onSubmit={event => { event.preventDefault(); popup.controller.close(true) }}>
                    <TextField vModel={value.value} focus class="monospace" style={{ width: Math.max(target.clientWidth, 200) + "px" }} />
                </form>
            ), {
                align: {
                    offsetX: -4,
                    offsetY: -6
                },
                props: {
                    cancelButton: false,
                    backdropCancels: true,
                    class: "rounded p-2 shadow",
                    noTransition: true
                },
            })

            if (!await popup) return null
            return value.value
        }

        async function changeValue(event: MouseEvent, key: string) {
            const value = await makeField(event, props.service.config.env[key])
            if (value == null) return

            const work = emitter.work("Changing value...")
            const result = await props.service.setEnvVariable({ key, value }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        async function renameValue(event: MouseEvent, key: string) {
            const newName = await makeField(event, key)
            if (newName == null) return
            if (newName == key) return

            const work = emitter.work("Renaming...")
            const result = await props.service.setEnvVariable({ key: newName, replace: key }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        async function deleteValue(key: string) {
            if (!await emitter.confirm("Do you really want to delete this value?")) return

            const work = emitter.work("Deleting...")
            const result = await props.service.setEnvVariable({ key: key, value: null }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        async function createValue() {
            const newValue = await emitter.genericModal({
                value: { key: "", value: "" },
                render: (value, handle) => (
                    <form onSubmit={event => { event.preventDefault(); handle.submit() }} class="flex column gap-2">
                        <div class="flex row">
                            <div class="flex-basis-100">Name:</div>
                            <TextField vModel={value.key} focus class="flex-fill monospace" />
                        </div>
                        <div class="flex row">
                            <div class="flex-basis-100">Value:</div>
                            <TextField vModel={value.value} class="flex-fill monospace" />
                        </div>
                    </form>
                )
            }, {
                props: {
                    okButton: "Create",
                    cancelButton: true,
                    class: "as-fill-card"
                }
            })

            if (!newValue) return

            const work = emitter.work("Creating...")
            const result = await props.service.setEnvVariable(newValue).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        return () => (
            <div>
                <div class="flex column border rounded h-500">
                    <div class="flex-fill">
                        <div class="absolute-fill scroll">
                            {Object.entries(props.service.config.env).map(([key, value]) => (
                                <div key={key} class="flex row hover-check center-cross">
                                    <Button onClick={event => renameValue(event, key)} clear class="text-left monospace">{key}</Button>
                                    <span class="monospace user-select-none">=</span>
                                    <Button onClick={event => changeValue(event, key)} clear class="text-left monospace flex-fill">{value}</Button>
                                    <Button onClick={() => deleteValue(key)} class="if-hover-fade" clear> <Icon icon={mdiTrashCan} /> </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div class="border-top flex row">
                        <div class="flex-fill"></div>
                        <Button onClick={createValue} clear> <Icon icon={mdiPlus} /> </Button>
                    </div>
                </div>
            </div>
        )
    }
}))