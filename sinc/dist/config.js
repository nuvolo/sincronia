var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const path_1 = __importDefault(require("path"));
    const fs_1 = __importDefault(require("fs"));
    const fsp = fs_1.default.promises;
    exports.CONFIG_FILE_PATH = path_1.default.join(process.cwd(), "sinc.config.json");
    exports.MANIFEST_FILE_PATH = path_1.default.join(process.cwd(), "sinc.manifest.json");
    const DEFAULT_CONFIG = {
        sourceDirectory: "src",
        ignoreDirectories: ["node_modules"],
        rules: []
    };
    async function _getConfig() {
        try {
            let configString = await fsp.readFile(exports.CONFIG_FILE_PATH, "utf-8");
            return JSON.parse(configString);
        }
        catch (e) {
            console.log("No configuration file found, loading default...");
            return DEFAULT_CONFIG;
        }
    }
    async function _getManifest() {
        try {
            let manifestString = await fsp.readFile(exports.MANIFEST_FILE_PATH, "utf-8");
            return JSON.parse(manifestString);
        }
        catch (e) {
            return undefined;
        }
    }
    exports.config = _getConfig();
    exports.manifest = _getManifest();
});
