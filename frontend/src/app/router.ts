import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { AuthScreen } from "../frontend/device/AuthScreen"
import { DeviceScreen } from "../frontend/device/DeviceScreen"
import { EventLogScreen } from "../frontend/device/EventLogScreen"
import { MachineAccessScreen } from "../frontend/device/MachineAccessScreen"
import { ServiceScreen } from "../frontend/service/ServiceScreen"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { useTitle } from "../frontend/useTitle"
import { Root } from "./Root"

const routes: RouteRecordRaw[] = [
    {
        component: { setup: () => (useTitle("Terminal"), () => h("div", { class: "flex-fill bg-black" }, [h(PersonalTerminalView)])) },
        path: "/terminal"
    },
    {
        component: Root,
        path: "/",
        children: [
            {
                name: "DeviceScreen",
                component: DeviceScreen,
                path: "/"
            },
            {
                name: "EventLogScreen",
                component: EventLogScreen,
                path: "/event-log"
            },
            {
                name: "MachineAccessScreen",
                component: MachineAccessScreen,
                path: "/machine-access"
            },
            {
                name: "ServiceScreen",
                component: ServiceScreen,
                path: "/service/:service"
            },
            {
                name: "AuthScreen",
                component: AuthScreen,
                path: "/auth"
            },
            {
                name: "404",
                component: { setup: () => (useTitle("Not found"), () => h("pre", { class: "m-4" }, "Page not found")) },
                path: "/:page(.*)*"
            }
        ]
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})