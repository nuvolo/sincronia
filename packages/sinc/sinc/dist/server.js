var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "axios", "./utils", "./PluginManager"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const axios_1 = __importDefault(require("axios"));
    const utils_1 = require("./utils");
    const PluginManager_1 = __importDefault(require("./PluginManager"));
    const axiosConfig = {
        withCredentials: true,
        auth: {
            username: process.env.SN_USER || "",
            password: process.env.SN_PASSWORD || ""
        },
        headers: {
            "Content-Type": "application/json"
        },
        baseURL: `https://${process.env.SN_INSTANCE}/`
    };
    const api = axios_1.default.create(axiosConfig);
    const WAIT_TIME = 500;
    const CHUNK_SIZE = 10;
    const TABLE_API = "api/now/table";
    async function _update(obj) {
        try {
            let resp = await api(obj);
        }
        catch (e) {
            console.error("The update request failed", e);
        }
    }
    async function pushUpdate(requestObj) {
        if (requestObj && requestObj.data) {
            return _update(requestObj);
        }
        console.error("Attempted to push an empty data object. No persistence for config", requestObj);
        return Promise.resolve();
    }
    exports.pushUpdate = pushUpdate;
    async function pushUpdates(arrOfResourceConfig) {
        await arrOfResourceConfig.map(pushUpdate);
    }
    exports.pushUpdates = pushUpdates;
    async function getManifestWithFiles(scope) {
        let endpoint = `api/x_nuvo_x/cicd/getManifestWithFiles/${scope}`;
        try {
            let response = await api.get(endpoint);
            return response.data.result;
        }
        catch (e) {
            throw e;
        }
    }
    exports.getManifestWithFiles = getManifestWithFiles;
    async function getManifest(scope) {
        let endpoint = `api/x_nuvo_x/cicd/getManifest/${scope}`;
        try {
            let response = await api.get(endpoint);
            return response.data.result;
        }
        catch (e) {
            throw e;
        }
    }
    exports.getManifest = getManifest;
    async function getMissingFiles(missing) {
        let endpoint = `api/x_nuvo_x/cicd/bulkDownload`;
        try {
            let response = await api.post(endpoint, missing);
            return response.data.result;
        }
        catch (e) {
            throw e;
        }
    }
    exports.getMissingFiles = getMissingFiles;
    function buildFileEndpoint(payload) {
        const { tableName, sys_id } = payload;
        return [TABLE_API, tableName, sys_id].join("/");
    }
    async function buildFileRequestObj(target_server, filePayload) {
        try {
            const url = buildFileEndpoint(filePayload);
            const fileContents = await PluginManager_1.default.getFinalFileContents(filePayload);
            const { targetField } = filePayload;
            const data = {};
            data[targetField] = fileContents;
            return { url, data, method: "PATCH" };
        }
        catch (e) {
            throw e;
        }
    }
    async function pushFiles(target_server, filesPayload) {
        let chunks = utils_1.chunkArr(filesPayload, CHUNK_SIZE);
        for (let chunk of chunks) {
            let results = chunk.map(ctx => {
                return pushFile(target_server, ctx);
            });
            await Promise.all(results);
            await utils_1.wait(WAIT_TIME);
        }
    }
    exports.pushFiles = pushFiles;
    async function pushFile(target_server, fileContext) {
        if (fileContext.sys_id && fileContext.targetField) {
            try {
                let requestObj = await buildFileRequestObj(target_server, fileContext);
                await pushUpdate(requestObj);
            }
            catch (e) {
                console.error("failed to push file");
            }
        }
    }
    exports.pushFile = pushFile;
});
