import { computed, defineComponent, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { STATE } from "../State"
import { TerminalView } from "./TerminalView"

export const PersonalTerminalView = (defineComponent({
    name: "PersonalTerminalView",
    props: {
        cwd: { type: String }
    },
    setup(props, ctx) {
        const id = ref<string | null>(null)
        const route = useRoute()

        const fill = computed(() => route.fullPath == "/terminal")

        STATE.terminalSpawner.open({ cwd: props.cwd }).then(openedID => id.value = openedID)

        onUnmounted(() => {
            STATE.terminalSpawner.close()
        })

        return () => (
            <TerminalView id={id.value ?? undefined} fill={fill.value} />
        )
    }
}))