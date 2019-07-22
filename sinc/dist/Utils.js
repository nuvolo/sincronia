var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./config", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const config_1 = require("./config");
    const path_1 = __importDefault(require("path"));
    async function _getConfigFromPath(params) {
        try {
            let curManifest = await config_1.manifest;
            if (!curManifest) {
                throw new Error("No Manifest file");
            }
            const { tableName, name } = params;
            const { tables, scope } = curManifest;
            const { records } = tables[tableName];
            let sys_id = "";
            if (records.hasOwnProperty(name)) {
                sys_id = records[name].sys_id;
            }
            return Object.assign({}, params, { scope: scope, sys_id: sys_id });
        }
        catch (e) {
            return;
        }
    }
    async function parseFileNameParams(filePath) {
        const ext = path_1.default.extname(filePath);
        const resourcePath = path_1.default.dirname(filePath).split(path_1.default.sep);
        const resources = resourcePath.slice(-3);
        const targetField = path_1.default.basename(filePath, ext);
        const tableName = resources[1];
        const name = resources[2];
        return await _getConfigFromPath({
            filePath,
            tableName,
            name,
            targetField,
            ext
        });
    }
    exports.parseFileNameParams = parseFileNameParams;
    async function getParsedFilesPayload(arr) {
        let results = [];
        for (let file of arr) {
            let res = await parseFileNameParams(file);
            if (res) {
                results.push(res);
            }
        }
        return results;
    }
    exports.getParsedFilesPayload = getParsedFilesPayload;
    function wait(ms) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, ms);
        });
    }
    exports.wait = wait;
    function chunkArr(arr, num) {
        let chunks = [];
        for (let i = 0; i < arr.length; i++) {
            chunks.push(arr.slice(i, i + num));
            i = i + num;
        }
        return chunks;
    }
    exports.chunkArr = chunkArr;
});
