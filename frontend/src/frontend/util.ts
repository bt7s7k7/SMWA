import { h } from "vue"

export function formatDate(time: number) {
    const date = new Date(time)
    return [`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate() + 1}`, h("br"), `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`]
}

export function formatTime(time: number) {
    time /= 1000

    const hours = Math.floor(time / 3600)
    time -= hours * 3600
    const minutes = Math.floor(time / 60)
    time -= minutes * 60
    const seconds = Math.floor(time)

    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
