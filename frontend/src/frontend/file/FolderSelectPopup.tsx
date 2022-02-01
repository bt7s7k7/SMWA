import { defineComponent, PropType, ref } from "vue"
import { GenericModalHandle } from "../../vue3gui/DynamicsEmitter"
import { FileBrowserView } from "./FileBrowserView"

export const FolderSelectPopup = (defineComponent({
    name: "FolderSelectPopup",
    props: {
        handle: { type: Object as PropType<GenericModalHandle<{ path: string }>>, required: true },
        initialPath: { type: String }
    },
    setup(props, ctx) {
        props.handle.resultFactory = () => ({ path: path.value })
        const path = ref("")

        return () => (
            <div class="flex column p-2 gap-2">
                <FileBrowserView class="w-500 h-500" onNavigated={newPath => path.value = newPath} initialPath={props.initialPath} />
            </div>
        )
    }
}))