export function fromInternalPath(path: string) {
    if (path.match(/^\/[A-Z]:\//)) {
        return path.substring(1).replace(/\//g, "\\")
    } else {
        return path
    }
}

export function toInternalPath(path: string) {
    if (path.match(/^[A-Z]:\\/)) {
        return "/" + path.replace(/\\/g, "/")
    } else {
        return path
    }

}
