import { Ref, watchEffect } from "vue"
import { STATE } from "./State"

export function useTitle(title?: Ref<string> | string) {
    watchEffect(() => {
        document.title = (title ? (typeof title == "string" ? title : title.value) + " - " : "") + (STATE.device ? STATE.device.config.label + " - " : "") + "SMWA"
    })
}