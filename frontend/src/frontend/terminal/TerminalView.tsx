import { computed, defineComponent, markRaw, onMounted, onUnmounted, ref, watch } from "vue"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import "xterm/css/xterm.css"
import { DISPOSE } from "../../eventLib/Disposable"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { StateCard } from "../../vue3gui/StateCard"
import { asyncComputed, stringifyError, useDebounce, useResizeWatcher } from "../../vue3gui/util"
import { STATE } from "../State"
import { TerminalHandleProxy } from "./TerminalHandleProxy"

export const TerminalView = (defineComponent({
    name: "TerminalView",
    props: {
        id: { type: String },
        fill: { type: Boolean }
    },
    setup(props, ctx) {
        const handle = asyncComputed(() => props.id, async id => id != null ? markRaw(await TerminalHandleProxy.make(STATE.connectionContext!, { track: true, id })) : null, {
            finalizer: handle => handle?.[DISPOSE]()
        })

        const terminal = new Terminal({
            cols: 160,
            rows: 60,
            fontFamily: "monospace",
            fontSize: 12,
            convertEol: true
        })

        const fit = new FitAddon()
        terminal.loadAddon(fit)

        const terminalElement = ref<HTMLElement>()

        watch(() => handle.value, handle => {
            if (!handle) return
            terminal.reset()
            handle.getBuffer().then(buffer => {
                terminal.write(buffer)
            })

            handle.onData.add(null, (data) => {
                terminal.write(data)
            })
        })

        terminal.onData(data => {
            handle.value?.write(data)
        })

        onUnmounted(() => {
            handle.value?.[DISPOSE]()
        })

        onMounted(() => {
            terminal.open(terminalElement.value!)
            if (props.fill) {
                setTimeout(() => {
                    fit.fit()
                }, 10)
            } else {
                setTimeout(() => {
                    fit.fit()
                }, 110)
            }
        })

        const size = useResizeWatcher()
        const widthDebounced = useDebounce(computed(() => size.width + " " + size.height), { delay: 50, intermediateUpdates: true, immediate: true })

        watch(widthDebounced, () => {
            fit.fit()
        })

        return () => (
            <Overlay noTransition show={handle.value == null} variant="white" class={["flex as-terminal", props.fill ? "fill" : "p-2"]}>{{
                overlay: () => <LoadingIndicator />,
                default: () => (
                    <Overlay show={handle.error} variant="white" class="flex-fill terminal-container">{{
                        overlay: () => <div class="p-2 bg-white rounded"><StateCard error>{stringifyError(handle.error)}</StateCard></div>,
                        default: () => (
                            <div class="terminal-parent" ref={terminalElement} />
                        )
                    }}</Overlay>
                )
            }}</Overlay>
        )
    }
}))
