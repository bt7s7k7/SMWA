import { defineComponent, onUnmounted, shallowRef, watch } from "vue"
import { MessageBridge } from "../../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../../dependencyInjection/DIContext"
import { RemoteUIProxy } from "../../remoteUIFrontend/RemoteUIProxy"
import { RemoteUIView } from "../../remoteUIFrontend/RemoteUIView"
import { StructSyncClient } from "../../structSync/StructSyncClient"
import { VirtualPeer } from "../../virtualNetwork/VirtualPeer"
import { STATE } from "../State"
import { ServiceProxy } from "./ServiceProxy"

export const ServiceAdminUI = (defineComponent({
    name: "ServiceAdminUI",
    props: {
        service: { type: ServiceProxy, required: true },
    },
    setup(props, ctx) {
        let conn: VirtualPeer.Connection | undefined
        let context: DIContext | undefined
        const remoteUI = shallowRef<RemoteUIProxy | null>(null)
        async function reconnect() {
            if (conn) {
                conn.end()
                conn = undefined
            }

            const virtualPeer = await STATE.virtualPeer
            if (virtualPeer == null) return
            const ids = await virtualPeer.findPeersByName(props.service.adminUIName)
            const id = ids[0]
            if (!id) return

            conn = await virtualPeer.connect(id)

            context = new DIContext()
            context.provide(MessageBridge, () => new MessageBridge.Generic(conn!))
            context.provide(StructSyncClient, "default")

            conn.onEnd.add(context, () => {
                context!.dispose()
                context = undefined
                conn = undefined
            })

            remoteUI.value = await RemoteUIProxy.make(context)
            context.guard(remoteUI.value)
            context.guard(() => remoteUI.value = null)
        }

        onUnmounted(() => {
            conn?.end()
        })

        let timer = -1
        watch(() => props.service.state, state => {
            if (state == "running" && timer == -1 && conn == null) {
                timer = setTimeout(() => {
                    timer = -1
                    reconnect()
                }, 500)
            }
        })

        reconnect()

        return () => (
            remoteUI.value == null ? (
                <div></div>
            ) : (
                <div class="border rounded p-2 gap-2">
                    <RemoteUIView remoteUI={remoteUI.value} route="/" />
                </div>
            )
        )
    }
}))