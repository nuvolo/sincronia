var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "./config", "./Watcher", "./AppManager"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const path_1 = __importDefault(require("path"));
    const config_1 = require("./config");
    const Watcher_1 = __importDefault(require("./Watcher"));
    const AppManager_1 = __importDefault(require("./AppManager"));
    async function devCommand() {
        const { sourceDirectory } = await config_1.config;
        const _codeSrcPath = path_1.default.join(process.cwd(), sourceDirectory);
        Watcher_1.default.startWatching(_codeSrcPath);
        console.log("Dev mode started!");
    }
    exports.devCommand = devCommand;
    async function refreshCommand() {
        try {
            await AppManager_1.default.syncManifest();
            console.log("Sync Complete!");
        }
        catch (e) {
            throw e;
        }
    }
    exports.refreshCommand = refreshCommand;
    async function pushCommand() {
        try {
            await AppManager_1.default.pushAllFiles();
            console.log("Push Complete!");
        }
        catch (e) {
            throw e;
        }
    }
    exports.pushCommand = pushCommand;
    async function downloadCommand(args) {
        try {
            await AppManager_1.default.downloadWithFiles(args.scope);
            console.log("Download Complete!");
        }
        catch (e) {
            console.error(e);
        }
    }
    exports.downloadCommand = downloadCommand;
});
