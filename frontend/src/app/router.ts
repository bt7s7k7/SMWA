import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { DeviceScreen } from "../frontend/device/DeviceScreen"
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
                name: "ServiceScreen",
                component: ServiceScreen,
                path: "/service/:service"
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