import { mdiChevronLeft, mdiFileOutline, mdiFolderOutline, mdiRefresh, mdiTrashCan } from "@mdi/js"
import { computed, defineComponent, ref, watch } from "vue"
import { DirentInfo } from "../../common/FileBrowser"
import { asError } from "../../comTypes/util"
import { eventDecorator } from "../../eventDecorator"
import { Path } from "../../path/Path"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { StateCard } from "../../vue3gui/StateCard"
import { asyncComputed, stringifyError } from "../../vue3gui/util"
import { STATE } from "../State"

export const FileBrowserView = eventDecorator(defineComponent({
    name: "FileBrowserView",
    props: {
        initialPath: { type: String }
    },
    emits: {
        navigated: (path: string) => true,
        selected: (file: string) => true
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const path = ref(props.initialPath ?? STATE.fileBrowser.homedir)
        const files = asyncComputed(() => path.value, path => STATE.fileBrowser.listDirectory({ path }).then(files => {
            files.sort((a, b) => (
                // Sort entries prefixed with a dot after others
                a.name[0] == "." && b.name[0] != "." ? 1
                    : a.name[0] != "." && b.name[0] == "." ? -1
                        // Sort directories before files
                        : a.type != b.type ? (a.type == "directory" ? -1 : 1)
                            : a.name.localeCompare(b.name)
            ))

            return files
        }), { persist: true })

        const backActive = computed(() => {
            return Path.parse(path.value).pathname != path.value
        })

        const pathSegments = computed(() => {
            let processedPath = path.value
            const segments: { name: string, path: string }[] = []
            while (true) {
                const { pathname, basename } = Path.parse(processedPath)
                segments.unshift({ name: basename, path: processedPath })
                if (pathname == processedPath) break
                processedPath = pathname
            }

            return segments
        })

        function select(entry: DirentInfo) {
            if (entry.type == "directory") {
                path.value = Path.join(path.value, entry.name)
            } else {
                ctx.emit("selected", Path.join(path.value, entry.name))
            }
        }

        function goBack() {
            path.value = Path.parse(path.value).pathname
        }

        async function deleteEntry(event: MouseEvent, entry: DirentInfo) {
            const popup = emitter.popup(event.target as HTMLElement, () => <StateCard working>Deleting...</StateCard>, { props: { class: "shadow rounded bg-white" }, align: "over" })
            const result = await STATE.fileBrowser.deleteEntry({ path: Path.join(path.value, entry.name) }).catch(asError)
            popup.controller.close()

            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            } else {
                files.reload()
            }
        }

        watch(path, path => {
            ctx.emit("navigated", path)
        })

        return () => (
            <div class="flex column gap-2">
                <Overlay variant="white" noTransition show={files.loading} class="flex-fill border rounded flex column">{{
                    overlay: () => <LoadingIndicator />,
                    default: () => <>
                        <div class="flex row gap-1 border-bottom">
                            <Button clear disabled={!backActive.value} onClick={goBack} > <Icon icon={mdiChevronLeft} /> </Button>
                            <div class="flex row">
                                {pathSegments.value.map(segment => <>
                                    <Button clear class="p-0" onClick={() => path.value = segment.path}>{(segment.name || "\xa0") + "/"}</Button>
                                </>)}
                            </div>
                            <div class="flex-fill"></div>
                            <Button clear onClick={() => files.reload()}> <Icon icon={mdiRefresh} /> </Button>
                        </div>
                        <div class="flex-fill">
                            <div class="absolute-fill flex column scroll">
                                {files.value?.map(entry => (
                                    <Button onClick={() => select(entry)} key={entry.name} clear class="flex row center-cross hover-check">
                                        <Icon icon={entry.type == "directory" ? mdiFolderOutline : mdiFileOutline} />&nbsp;{entry.name}
                                        <div class="flex-fill"></div>
                                        <Button clear class="if-hover-fade" onClick={event => deleteEntry(event, entry)}> <Icon icon={mdiTrashCan} /> </Button>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </>
                }}</Overlay>
            </div>
        )
    }
}))