import { computed, defineComponent, PropType, ref, watch } from "vue"
import { GenericModalHandle } from "../../vue3gui/DynamicsEmitter"
import { TextField } from "../../vue3gui/TextField"

export const UserCreator = (defineComponent({
    name: "UserCreator",
    props: {
        handle: { type: Object as PropType<GenericModalHandle<{ username: string, password: string }>>, required: true }
    },
    setup(props, ctx) {
        const username = ref("")
        const password = ref("")
        const passwordConfirm = ref("")

        const passwordMatches = computed(() => password.value == passwordConfirm.value)

        props.handle.resultFactory = () => ({ username: username.value, password: password.value })

        watch(passwordMatches, (passwordMatches) => {
            props.handle.controller.okBlocked = !passwordMatches
        })

        return () => (
            <form onSubmit={event => { event.preventDefault(); props.handle.submit() }} class="flex column gap-4 p-4">
                <h3 class="m-0">Create user</h3>
                <div class="flex column gap-2">
                    <div class="flex row">
                        <div class="flex-basis-100">Username</div>
                        <TextField autocomplete="username" vModel={username.value} class="flex-fill" />
                    </div>
                    <div class="flex row">
                        <div class="flex-basis-100">Password</div>
                        <TextField autocomplete="new-password" vModel={password.value} type="password" class="flex-fill" />
                    </div>
                    <div class="flex row">
                        <div class="flex-basis-100">Confirm</div>
                        <TextField autocomplete="new-password" vModel={passwordConfirm.value} type="password" class="flex-fill" />
                    </div>
                    {!passwordMatches.value && <div class="text-danger">Passwords must match</div>}
                </div>
            </form>
        )
    }
}))

export const UserPasswordChange = (defineComponent({
    name: "UserPasswordChange",
    props: {
        handle: { type: Object as PropType<GenericModalHandle<{ password: string }>>, required: true },
    },
    setup(props, ctx) {
        const password = ref("")
        const passwordConfirm = ref("")

        const passwordMatches = computed(() => password.value == passwordConfirm.value)

        props.handle.resultFactory = () => ({ password: password.value })

        watch(passwordMatches, (passwordMatches) => {
            props.handle.controller.okBlocked = !passwordMatches
        })

        return () => (
            <form onSubmit={event => { event.preventDefault(); props.handle.submit() }} class="flex column gap-4 p-4">
                <h3 class="m-0">Change password</h3>
                <div class="flex column gap-2">
                    <div class="flex row">
                        <div class="flex-basis-100">Password</div>
                        <TextField autocomplete="new-password" vModel={password.value} type="password" class="flex-fill" />
                    </div>
                    <div class="flex row">
                        <div class="flex-basis-100">Confirm</div>
                        <TextField autocomplete="new-password" vModel={passwordConfirm.value} type="password" class="flex-fill" />
                    </div>
                    {!passwordMatches.value && <div class="text-danger">Passwords must match</div>}
                </div>
            </form>
        )
    }
}))