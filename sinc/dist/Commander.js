var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./commands", "yargs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const commands_1 = require("./commands");
    const yargs_1 = __importDefault(require("yargs"));
    function initCommands() {
        yargs_1.default
            .command(["dev", "d"], "Start Development Mode", {}, commands_1.devCommand)
            .command(["refresh", "r"], "Refresh Manifest and download new files since last refresh", {}, commands_1.refreshCommand)
            .command(["push"], "[DESTRUCTIVE] Push all files from current local files to ServiceNow instance.", {}, commands_1.pushCommand)
            .command("download [scope]", "Downloads a scoped application's files from ServiceNow. Must specify a scope prefix for a scoped app.", {}, (args) => {
            commands_1.downloadCommand(args);
        })
            .help().argv;
    }
    exports.initCommands = initCommands;
});
