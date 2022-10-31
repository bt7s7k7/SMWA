import { mdiAlert } from "@mdi/js"
import { defineComponent, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { asError } from "../../comTypes/util"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { stringifyError } from "../../vue3gui/util"
import { STATE } from "../State"

export const AuthScreen = (defineComponent({
    name: "AuthScreen",
    setup(props, ctx) {
        const loading = ref(false)
        const error = ref<string | null>(null)
        const route = useRoute()

        onMounted(async () => {
            let service
            let redirect
            try {
                service = route.query.service
                if (typeof service != "string" || service == "") {
                    throw new Error("Invalid service parameter")
                }
                const redirectString = route.query.redirect
                if (typeof redirectString != "string" || redirectString == "") {
                    throw new Error("Invalid redirect parameter")
                }

                try {
                    redirect = new URL(redirectString)
                } catch {
                    throw new Error("Invalid redirect URL")
                }
            } catch (err) {
                loading.value = false
                error.value = stringifyError(err)

                return
            }

            const result = await STATE.device.authenticate({ service }).catch(asError)

            if (result instanceof Error) {
                loading.value = false
                error.value = stringifyError(result)

                return
            }

            redirect.searchParams.set("key", result)
            location.href = redirect.href
        })

        return () => (
            <div class="flex-fill flex column center">
                {loading.value ? (
                    <LoadingIndicator />
                ) : error.value ? <>
                    <h1> <Icon icon={mdiAlert} /> </h1>
                    <div>{error.value}</div>
                </> : (
                    <div>Redirecting...</div>
                )}
            </div>
        )
    }
}))