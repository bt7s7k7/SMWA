export { }

declare global {
    interface Error {
        code?: string
    }
}