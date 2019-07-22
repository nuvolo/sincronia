var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "chokidar", "./utils", "./server"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const chokidar_1 = __importDefault(require("chokidar"));
    const Utils = __importStar(require("./utils"));
    const server_1 = require("./server");
    class Watcher {
        constructor() {
            this.watcher = undefined;
        }
        startWatching(directory) {
            this.watcher = chokidar_1.default.watch(directory);
            this.watcher.on("change", this.fileChanged);
        }
        async fileChanged(path) {
            try {
                let payload = await Utils.parseFileNameParams(path);
                const targetServer = process.env.SN_INSTANCE ||
                    console.error("No server configured for push!") ||
                    "";
                if (targetServer && payload) {
                    await server_1.pushFile(targetServer, payload);
                    console.log(`${path} pushed to server!`);
                }
            }
            catch (e) {
                console.error(`${path} failed to sync!`);
            }
        }
        stopWatching() {
            if (this.watcher) {
                this.watcher.close();
            }
        }
    }
    exports.default = new Watcher();
});
