import { defineComponent } from "vue"
import { TerminalView } from "../terminal/TerminalView"
import { useTitle } from "../useTitle"

export const EventLogScreen = (defineComponent({
    name: "EventLogScreen",
    setup(props, ctx) {
        useTitle("Event Log")

        return () => (
            <div class="flex-fill flex column p-2 gap-2">
                <div class="border rounded p-2 gap-2 flex row" key="terminal">
                    <TerminalView fill id={"__event_log"} />
                </div>
            </div>
        )
    }
}))
