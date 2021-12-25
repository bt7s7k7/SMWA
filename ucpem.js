/// <reference path="./.vscode/config.d.ts" />

const { project, include, github } = require("ucpem")

include("frontend/ucpem.js")

project.prefix("src").res("common",
    github("bt7s7k7/Struct").res("structSync"),
    github("bt7s7k7/SimpleServer").res("simpleAuth"),
)

project.prefix("src").res("backend",
    project.ref("common"),
    github("bt7s7k7/Struct").res("structSyncExpress"),
    github("bt7s7k7/LogLib").res("nodeLogger"),
    github("bt7s7k7/SimpleServer").res("simpleDB"),
)