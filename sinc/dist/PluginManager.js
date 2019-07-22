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
        define(["require", "exports", "./config", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    var __syncRequire = typeof module === "object" && typeof module.exports === "object";
    Object.defineProperty(exports, "__esModule", { value: true });
    const config_1 = require("./config");
    const fs_1 = __importDefault(require("fs"));
    const path_1 = __importDefault(require("path"));
    const fsp = fs_1.default.promises;
    class PluginManager {
        constructor() {
            this.pluginRules = [];
        }
        async loadPluginConfig() {
            let conf = await config_1.config;
            if (conf && conf.rules) {
                this.pluginRules = conf.rules;
            }
            else {
                console.log("No rules detected!");
            }
        }
        determinePlugins(context) {
            let plugins = [];
            for (let rule of this.pluginRules) {
                let reg = new RegExp(rule.match);
                if (reg.test(context.filePath)) {
                    plugins = rule.plugins;
                }
            }
            return plugins;
        }
        async runPlugins(plugins, context, content) {
            try {
                let output = content;
                for (let pConfig of plugins) {
                    let pluginPath = path_1.default.join(process.cwd(), "node_modules", pConfig.name);
                    let plugin = await (__syncRequire ? Promise.resolve().then(() => __importStar(require(pluginPath))) : new Promise((resolve_1, reject_1) => { require([pluginPath], resolve_1, reject_1); }).then(__importStar));
                    let results = await plugin.run(context, output, pConfig.options);
                    if (!results.success) {
                        return {
                            success: false,
                            content: ""
                        };
                    }
                    output = results.output;
                }
                return {
                    success: true,
                    content: output
                };
            }
            catch (e) {
                throw e;
            }
        }
        async processFile(context, content) {
            let plugins = this.determinePlugins(context);
            if (plugins.length > 0) {
                try {
                    let pluginResults = await this.runPlugins(plugins, context, content);
                    if (pluginResults.success) {
                        return pluginResults.content;
                    }
                    else {
                        return "";
                    }
                }
                catch (e) {
                    throw e;
                }
            }
            else {
                return content;
            }
        }
        async getFinalFileContents(context) {
            const { filePath } = context;
            try {
                const contents = await fsp.readFile(filePath, "utf-8");
                await this.loadPluginConfig();
                return await this.processFile(context, contents);
            }
            catch (e) {
                throw e;
            }
        }
    }
    exports.default = new PluginManager();
});
