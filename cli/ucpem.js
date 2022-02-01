/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.isChild()

project.prefix("src").res("cli",
    project.ref("common"),
    github("bt7s7k7/Struct").res("structSyncAxios")
)