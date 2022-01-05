import { mdiAccount, mdiFormTextboxPassword, mdiPlus, mdiTrashCan } from "@mdi/js"
import { defineComponent } from "vue"
import { User } from "../../common/User"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { asyncComputed, stringifyError } from "../../vue3gui/util"
import { STATE } from "../State"
import { UserCreator, UserPasswordChange } from "./UserCreator"

export const UsersView = (defineComponent({
    name: "UsersView",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const users = asyncComputed(() => { }, () => STATE.adminAuth.proxy.listUsers(), { persist: true })

        function openUserMenu(event: MouseEvent, user: User) {
            async function changePassword() {
                const result = await emitter.genericModal(UserPasswordChange, {
                    props: { cancelButton: true, okButton: "Create" },
                    contentProps: { class: "as-fill-card" }
                })

                if (result) {
                    const work = emitter.work("Changing password")
                    await STATE.adminAuth.proxy.changePassword({ username: user.id, password: result.password }).catch(err => {
                        emitter.alert(stringifyError(err), { error: true })
                    })

                    work.done()
                    users.reload()
                }
            }

            async function deleteUser() {
                if (await emitter.confirm("Do you really want to delete user " + user.id + "?")) {
                    const work = emitter.work("Deleting user")
                    await STATE.adminAuth.proxy.deleteAccount({ username: user.id }).catch(err => {
                        emitter.alert(stringifyError(err), { error: true })
                    })

                    work.done()
                    users.reload()
                }
            }

            const popup = emitter.popup(event.target as HTMLElement, () => (
                <div class="flex column">
                    <small> <Icon icon={mdiAccount} /> {user.id} </small>
                    <div class="border-bottom my-2"></div>
                    <Button onClick={() => { popup.controller.close(); changePassword() }} class="text-left" clear> <Icon icon={mdiFormTextboxPassword} /> Change password </Button>
                    <Button onClick={() => { popup.controller.close(); deleteUser() }} class="text-left" clear> <Icon icon={mdiTrashCan} /> Delete </Button>
                </div>
            ), {
                align: "over",
                props: { backdropCancels: true, class: "shadow rounded bg-white" }
            })
        }

        async function createUser() {
            const userInfo = await emitter.genericModal(UserCreator, {
                props: { cancelButton: true, okButton: "Create" },
                contentProps: { class: "as-fill-card" }
            })

            if (userInfo) {
                const work = emitter.work("Creating user")
                await STATE.adminAuth.proxy.register(userInfo).catch(err => {
                    emitter.alert(stringifyError(err), { error: true })
                })
                work.done()
                users.reload()
            }
        }

        return () => (
            <div class="flex column gap-4">
                <h3 class="m-0">Users</h3>
                <div class="flex column">
                    {users.value?.map(user => (
                        <Button onClick={event => openUserMenu(event, user)} clear key={user.id} class="text-left"> <Icon icon={mdiAccount} /> {user.id} </Button>
                    ))}
                </div>
                <div class="flex row">
                    <Button variant="success" onClick={createUser}> <Icon icon={mdiPlus} /> Add user </Button>
                </div>
            </div>
        )
    }
}))