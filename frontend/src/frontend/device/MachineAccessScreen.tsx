import { mdiClose, mdiKey, mdiPlus, mdiTrashCan } from "@mdi/js"
import { computed, defineComponent, ref } from "vue"
import { asError } from "../../comTypes/util"
import { AccessToken } from "../../common/AccessToken"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { TextField } from "../../vue3gui/TextField"
import { stringifyError, useResizeWatcher } from "../../vue3gui/util"
import { STATE } from "../State"
import { FolderSelectPopup } from "../file/FolderSelectPopup"
import { useTitle } from "../useTitle"
import { formatDate } from "../util"

export const MachineAccessScreen = (defineComponent({
    name: "MachineAccessScreen",
    setup(props, ctx) {
        useTitle("Machine Access")

        const emitter = useDynamicsEmitter()

        async function createToken() {
            const label = await emitter.prompt({ title: "Enter token label" })
            if (!label) return

            const work = emitter.work("Creating token")
            const result = await STATE.accessTokens.addToken({ label }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        async function deleteToken(token: AccessToken) {
            if (!await emitter.confirm(`Do you really want to delete token "${token.label}". All devices using this token will stop working.`)) return

            const work = emitter.work("Deleting token")
            const result = await STATE.accessTokens.deleteToken({ id: token.id }).catch(asError)
            work.done()
            if (result instanceof Error) {
                emitter.alert(stringifyError(result), { error: true })
            }
        }

        async function openDeployPathPopup(event: MouseEvent) {
            const result = await emitter.genericModal(FolderSelectPopup, {
                props: { cancelButton: true, okButton: "Select" },
                contentProps: { initialPath: STATE.device.config.deployPath }
            })

            if (result) {
                STATE.device.setDeployPath({ path: result.path })
            }
        }

        async function openAuthURLPopup(event: MouseEvent) {
            const value = ref(STATE.device.config.authURL ?? "")
            const target = event.target as HTMLElement
            const popup = emitter.popup(target, () => (
                <form onSubmit={event => { event.preventDefault(); popup.controller.close(true) }}>
                    <TextField vModel={value.value} focus class="monospace" style={{ width: Math.max(target.clientWidth, 200) + "px" }} />
                    <Button clear onClick={() => { value.value = ""; popup.controller.close(true) }}> <Icon icon={mdiClose} /> Disable </Button>
                </form>
            ), {
                align: {
                    offsetX: -4,
                    offsetY: -6
                },
                props: {
                    cancelButton: false,
                    backdropCancels: true,
                    class: "rounded p-2 shadow",
                    noTransition: true
                },
            })

            if (!await popup) return null

            STATE.device.setAuthURL({ url: value.value ? value.value : null }).catch(err => {
                emitter.alert(stringifyError(err), { error: true })
            })
        }

        const size = useResizeWatcher()
        const doWrap = computed(() => size.width < 1100)

        return () => {
            const accessTokenView = <>
                <h3 class="m-0">Access Tokens</h3>
                <div class="flex column gap-2">
                    {STATE.accessTokens.tokens.size > 0 ? [...STATE.accessTokens.tokens.values()].map(token => (
                        <small key={token.id} class="border rounded p-2 flex column gap-2">
                            <div class="flex row gap-2 center-cross">
                                <Icon icon={mdiKey} />
                                {token.label}
                            </div>
                            <div>
                                <span class="muted">{token.token}</span>
                            </div>
                            <div class="absolute top-0 right-0 p-2">
                                <span class="muted">{token.lastUsed == -1 ? "Never used" : "Last used " + formatDate(token.lastUsed, "string")}</span>
                                <Button clear onClick={() => deleteToken(token)}> <Icon icon={mdiTrashCan} /> </Button>
                            </div>
                        </small>
                    )) : <small class="muted">No tokens added</small>}
                </div>
                <div class="flex row">
                    <Button onClick={createToken} variant="success"> <Icon icon={mdiPlus} /> Add Token </Button>
                </div>
            </>

            const networkInfo = <>
                <h3 class="m-0">Network info</h3>

                <div>
                    {STATE.device.interfaces.map(v => <pre class="m-0">{v}</pre>)}
                </div>

                <h3 class="m-0">Deploy path</h3>
                <Button onClick={openDeployPathPopup} clear class="text-left">{STATE.device.config.deployPath ?? <code>{"<"}unset{">"}</code>}</Button>
                <h3 class="m-0">Auth URL</h3>
                <Button onClick={openAuthURLPopup} clear class="text-left">{STATE.device.config.authURL ?? <code>{"<"}unset{">"}</code>}</Button>
            </>

            return !doWrap.value ? (
                <div class="flex-fill flex row gap-2 p-2">
                    <div class="border rounded flex-fill overflow-hidden">
                        <div class="absolute-fill scroll p-4 flex column gap-4">
                            {accessTokenView}
                        </div>
                    </div>
                    <div class="border rounded flex-basis-400 p-4 flex column gap-4">
                        {networkInfo}
                    </div>
                </div>
            ) : (
                <div class="flex-fill">
                    <div class="absolute-fill scroll flex column p-2 gap-2">
                        <div class="border rounded p-4 flex column gap-4">
                            {accessTokenView}
                        </div>
                        <div class="border rounded p-4 flex column gap-4">
                            {networkInfo}
                        </div>
                    </div>
                </div>
            )
        }
    }
}))
