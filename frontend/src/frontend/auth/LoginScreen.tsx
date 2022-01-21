import axios from "axios"
import { defineComponent, ref } from "vue"
import LOGO from "../../../icon.png?url"
import { asError } from "../../comTypes/util"
import { Button } from "../../vue3gui/Button"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { stringifyError } from "../../vue3gui/util"
import { STATE } from "../State"
import { useTitle } from "../useTitle"

export const LoginScreen = (defineComponent({
    name: "LoginScreen",
    setup(props, ctx) {
        useTitle("Login")

        const loading = ref(false)
        const username = ref("")
        const password = ref("")
        const error = ref("")

        async function login() {
            loading.value = true
            error.value = ""
            const result = await STATE.auth.login(username.value, password.value).catch(asError)
            loading.value = false
            if (result instanceof Error) {
                if (axios.isAxiosError(result)) {
                    error.value = stringifyError(result)
                } else throw result
            }
        }

        return () => (
            <div class="flex-fill flex column">
                <div class="flex-fill flex center">
                    <img src={LOGO} class="w-100 ignored user-select-none muted" style="filter: brightness(0)" />
                </div>
                <div class="flex center">
                    <Overlay show={loading.value}>{{
                        overlay: () => <LoadingIndicator />,
                        default: () => (
                            <form class="border rounded p-4 py-7 flex column gap-5 as-fill-card" onSubmit={event => { event.preventDefault(); login() }}>
                                <div class="flex column gap-2">
                                    <div class="flex row">
                                        <div class="flex-basis-100">Username</div>
                                        <TextField autocomplete="username" vModel={username.value} focus class="flex-fill" />
                                    </div>
                                    <div class="flex row">
                                        <div class="flex-basis-100">Password</div>
                                        <TextField autocomplete={"current-password"} type="password" vModel={password.value} class="flex-fill" />
                                    </div>
                                </div>
                                <div class="flex row">
                                    <div class="flex-fill text-danger">
                                        {error.value}
                                    </div>
                                    <Button submit clear variant="primary" class="text-primary">
                                        Login
                                    </Button>
                                </div>
                            </form>
                        ),
                    }}</Overlay>
                </div>
                <div class="flex-fill"></div>
            </div>
        )
    }
}))