import chalk from "chalk"
import { createInterface } from "readline"


function goUp() {
    process.stdout.write("\x1b[1A")
}

const LOADING_INDICATOR = "|/-\\".split("")
const rl = createInterface(process.stdin, process.stdout)
rl.pause()

export namespace UI {
    export function writeLine(text: string, type: "normal" | "nowrap" | "overwrite" = "normal") {
        if (type == "normal") process.stdout.write(text + "\n")
        else if (type == "nowrap") process.stdout.write(text)
        else if (type == "overwrite") process.stdout.write("\r\x1b[2K" + text)
    }

    export function indeterminateProgress(message: string) {
        let loadingIndicatorIndex = 0
        const interval = setInterval(() => {
            writeLine(`${chalk.yellowBright(LOADING_INDICATOR[loadingIndicatorIndex])} ${message}`, "overwrite")
            loadingIndicatorIndex = (loadingIndicatorIndex + 1) % LOADING_INDICATOR.length
        }, 100)

        return {
            done() {
                writeLine("", "overwrite")
                clearInterval(interval)
            },
            setMessage(newMessage: string) {
                message = newMessage
            }
        }
    }

    export function success(message: string) {
        writeLine(chalk.greenBright(message))
    }

    export function error(message: string) {
        writeLine(chalk.redBright(message))
    }

    export function prompt(message: string) {
        return new Promise<string>(resolve => {
            writeLine(chalk.cyanBright(message))
            rl.question("> ", answer => {
                resolve(answer)
                rl.pause()
            })
        })
    }

    export function select<T>(message: string, options: T[], labelFactory: (item: T) => string) {
        return new Promise<T | null>(resolve => {
            writeLine(chalk.cyanBright(message))
            process.stdin.setRawMode(true)
            process.stdin.resume()
            let selected = options[0]
            let selectedIndex = 0

            function update(noClear = false) {
                if (!noClear) {
                    for (let i = 0; i < options.length; i++) {
                        goUp()
                        writeLine("", "overwrite")
                    }
                }

                for (const option of options) {
                    writeLine(`${option == selected ? ">" : " "} ${labelFactory(option)}`)
                }

                process.stdin.once("data", (data) => {
                    //writeLine(JSON.stringify(data.toString()), "overwrite")
                    writeLine("", "overwrite")
                    const inputText = data.toString()
                    if (inputText.toLowerCase() == "q") {
                        resolve(null)
                        process.stdin.setRawMode(false)
                        process.stdin.pause()
                        return
                    } else if (inputText == "\x1b[A") {
                        selectedIndex--
                        if (selectedIndex < 0) selectedIndex = options.length - 1
                    } else if (inputText == "\x1b[B") {
                        selectedIndex++
                        if (selectedIndex >= options.length) selectedIndex = 0
                    } else if (inputText == "\r") {
                        resolve(selected)
                        process.stdin.setRawMode(false)
                        process.stdin.pause()
                        return
                    }

                    selected = options[selectedIndex]
                    update()
                })
            }
            update(!!"no clear")
        })
    }
}