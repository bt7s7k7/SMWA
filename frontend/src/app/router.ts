import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { DeviceScreen } from "../frontend/device/DeviceScreen"

const routes: RouteRecordRaw[] = [
    {
        name: "DeviceScreen",
        component: DeviceScreen,
        path: "/"
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})