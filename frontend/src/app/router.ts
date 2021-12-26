import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { DeviceScreen } from "../frontend/device/DeviceScreen"
import { PersonalTerminalView } from "../frontend/terminal/PersonalTerminalView"
import { Root } from "./Root"

const routes: RouteRecordRaw[] = [
    {
        component: Root,
        path: "/",
        children: [
            {
                name: "DeviceScreen",
                component: DeviceScreen,
                path: "/"
            }
        ]
    },
    {
        component: () => h("div", { class: "flex-fill bg-black" }, [h(PersonalTerminalView)]),
        path: "/terminal"
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})