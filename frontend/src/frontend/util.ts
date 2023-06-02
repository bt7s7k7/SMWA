import { h } from "vue"

export function formatDate(time: number, format: "vnode" | "string" | "date only string" = "vnode") {
    const date = new Date(time)
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${(date.getDate()).toString().padStart(2, "0")}`
    const timeString = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`
    if (format == "vnode") return [dateString, h("br"), timeString]
    if (format == "string") return dateString + " " + timeString
    if (format == "date only string") return dateString
}

export function formatTime(time: number) {
    time /= 1000

    const hours = Math.floor(time / 3600)
    time -= hours * 3600
    const minutes = Math.floor(time / 60)
    time -= minutes * 60
    const seconds = Math.floor(time)

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
