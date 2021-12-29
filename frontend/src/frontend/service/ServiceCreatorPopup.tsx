import { computed, defineComponent, PropType, ref, watch } from "vue"
import { unreachable } from "../../comTypes/util"
import { GenericModalHandle } from "../../vue3gui/DynamicsEmitter"
import { StateCard } from "../../vue3gui/StateCard"
import { TextField } from "../../vue3gui/TextField"
import { asyncComputed, stringifyError } from "../../vue3gui/util"
import { FileBrowserView } from "../file/FileBrowserView"
import { STATE } from "../State"

export const ServiceCreatorPopup = (defineComponent({
    name: "ServiceCreator",
    props: {
        handle: { type: Object as PropType<GenericModalHandle<{ path: string, label: string }>>, required: true }
    },
    setup(props, ctx) {
        props.handle.resultFactory = () => ({ path: path.value, label: label.value })
        props.handle.controller.okBlocked = true
        const path = ref("")
        const label = ref("")
        const definition = asyncComputed(() => path.value, path => STATE.services.tryPath({ path }), { errorsSilent: true })

        watch(() => definition.value, definition => {
            props.handle.controller.okBlocked = definition == null
            if (definition) {
                label.value = definition.name
                    // Convert from snake case to tile case
                    .replace(/(?:_|^)[a-z]/g, (v) => v.toUpperCase().replace(/^_/, " "))
            }
        })

        const error = computed(() => {
            const text = stringifyError(definition.error).replace(/^Server Error: /, "")
            if (text.startsWith("Failed to read definition file: ")) {
                return <div>
                    <div>Failed to read definition file</div>
                    <pre class="m-0 mt-2">{text.substring(32)}</pre>
                </div>
            }
            return text
        })

        return () => (
            <div class="flex column p-2 gap-2">
                <FileBrowserView class="w-500 h-500" onNavigated={newPath => path.value = newPath} onReload={() => definition.reload()} />
                {
                    definition.loading ? <StateCard working>Testing...</StateCard> :
                        definition.error ? <StateCard error>{error.value}</StateCard> :
                            definition.value ? <div>Found service <code>{definition.value.name}</code></div>
                                : unreachable()
                }
                {definition.value && <div class="flex row">
                    <div class="flex-basis-100">Label: </div>
                    <TextField vModel={label.value} class="flex-fill" />
                </div>}
            </div>
        )
    }
}))
