import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { DeviceScreen } from "../frontend/device/DeviceScreen"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { Root } from "./Root"

const routes: RouteRecordRaw[] = [
    {
        component: { render: () => h("div", { class: "flex-fill bg-black" }, [h(PersonalTerminalView)]) },
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
                name: "404",
                component: { render: () => h("pre", { class: "m-4" }, "Page not found") },
                path: "/:page(.*)*"
            }
        ]
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})