import { mdiChevronLeft, mdiFileOutline, mdiFolderOutline, mdiFolderPlusOutline, mdiRefresh, mdiTrashCan } from "@mdi/js"
import { ComponentPublicInstance, computed, defineComponent, ref, watch } from "vue"
import { asError } from "../../comTypes/util"
import { DirentInfo } from "../../common/FileBrowser"
import { toInternalPath } from "../../common/common"
import { eventDecorator } from "../../eventDecorator"
import { Path } from "../../path/Path"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { StateCard } from "../../vue3gui/StateCard"
import { TextField } from "../../vue3gui/TextField"
import { asyncComputed, stringifyError, useEventListener } from "../../vue3gui/util"
import { STATE } from "../State"

export const FileBrowserView = eventDecorator(defineComponent({
    name: "FileBrowserView",
    props: {
        initialPath: { type: String }
    },
    emits: {
        navigated: (path: string) => true,
        selected: (file: string) => true,
        reload: () => true
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const path = ref(toInternalPath(props.initialPath ?? STATE.fileBrowser.homedir))
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

        function reload() {
            ctx.emit("reload")
            files.reload()
        }

        watch(path, path => {
            ctx.emit("navigated", path)
        }, { immediate: true })

        async function mkdir(event: MouseEvent) {
            const name = ref("")
            const success = await emitter.popup(
                event.target as HTMLElement,
                () => <TextField focus placeholder="Folder name" vModel={name.value} />,
                {
                    align: "over",
                    props: { backdropCancels: true, class: "bg-white rounded shadow w-200 p-2" },
                }
            )

            if (success && name.value) {
                const work = emitter.work("Creating folder...")
                const result = await STATE.fileBrowser.mkdir({ name: name.value, path: path.value }).catch(asError)
                work.done()
                if (result instanceof Error) {
                    emitter.alert(stringifyError(result), { error: true })
                } else {
                    files.reload()
                }
            }
        }

        const container = ref<ComponentPublicInstance>()
        const searchContainer = ref<HTMLElement>()
        const search = ref("")
        let searchPopupOpen = false
        useEventListener(window, "keydown", (event) => {
            if (searchPopupOpen) return
            if (event.code == "Backspace") {
                goBack()
                return
            }
            if (event.key.length != 1) return
            if (!document.activeElement || document.activeElement?.tagName != "INPUT") {
                search.value = ""
                searchPopupOpen = true
                const popup = emitter.popup(
                    container.value!.$el,
                    () => <TextField focus placeholder="Folder name" vModel={search.value} onBlur={() => popup.controller.close()} />,
                    {
                        align: "bottom-left",
                        props: { backdropCancels: true, class: "bg-white rounded shadow w-200 p-2" },
                    }
                )

                popup.then((enter) => {
                    if (enter && searchResultElement.value) {
                        select(files.value![+searchResultElement.value.dataset.index!])
                    }
                    searchPopupOpen = false
                    search.value = ""
                })
            }
        })
        let lastFoundElement: HTMLElement | null = null
        const searchResultElement = computed(() => {
            const query = search.value.toLowerCase()
            if (!query) {
                lastFoundElement = null
                return null
            }

            let result: HTMLElement | null = null
            for (const child of Array.from(searchContainer.value!.children) as HTMLElement[]) {
                if (child.dataset.name!.toLowerCase().startsWith(query)) {
                    result = child
                    break
                }
            }
            if (!result) {
                for (const child of Array.from(searchContainer.value!.children) as HTMLElement[]) {
                    if (child.dataset.name!.toLowerCase().includes(query)) {
                        result = child
                        break
                    }
                }
            }

            if (result) {
                lastFoundElement = result
                return result
            } else {
                return lastFoundElement
            }
        })

        watch(searchResultElement, (current, last) => {
            if (last == current) return
            if (last) last.classList.remove("as-grow")
            if (current) {
                current.classList.add("as-grow")
                current.scrollIntoView()
            }
        })

        return () => (
            <div class="flex column gap-2">
                <Overlay variant="white" noTransition show={files.loading} class="flex-fill border rounded flex column" ref={container}>{{
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
                            <div>
                                <Button clear onClick={mkdir}> <Icon icon={mdiFolderPlusOutline} /> </Button>
                                <Button clear onClick={reload}> <Icon icon={mdiRefresh} /> </Button>
                            </div>
                        </div>
                        <div class="flex-fill">
                            <div class="absolute-fill flex column scroll" ref={searchContainer}>
                                {files.value?.map((entry, index) => (
                                    <Button onClick={() => select(entry)} key={entry.name} clear class="flex row center-cross hover-check" data-name={entry.name} data-index={index}>
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
