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
        define(["require", "exports", "./server", "fs", "path", "./config", "./utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const server_1 = require("./server");
    const fs_1 = __importDefault(require("fs"));
    const path_1 = __importDefault(require("path"));
    const config_1 = require("./config");
    const Utils = __importStar(require("./utils"));
    //import { pushFiles } from "./filePusher";
    const fsp = fs_1.default.promises;
    class AppManager {
        constructor() { }
        async writeManifestFile(man) {
            return fsp.writeFile(config_1.MANIFEST_FILE_PATH, JSON.stringify(man, null, 2));
        }
        async writeNewFiles(file, parentDir, content, skipFileCheck) {
            let exists = true;
            if (!skipFileCheck) {
                let files = await fsp.readdir(parentDir);
                let matchingFiles = files.filter(f => {
                    let reg = new RegExp(file.name + ".*$");
                    return reg.test(f);
                });
                exists = matchingFiles.length > 0;
            }
            if (skipFileCheck || !exists) {
                await fsp.writeFile(path_1.default.join(parentDir, `${file.name}.${file.type}`), content);
            }
        }
        async createNewFiles(manifest, skipFileCheck) {
            const { sourceDirectory = "src" } = (await config_1.config) || {};
            const { tables } = manifest;
            const _codeSrcPath = path_1.default.join(process.cwd(), sourceDirectory);
            for (let tableName in tables) {
                let table = tables[tableName];
                let tableFolder = path_1.default.join(_codeSrcPath, tableName);
                for (let recKey in table.records) {
                    const rec = table.records[recKey];
                    let recPath = path_1.default.join(tableFolder, rec.name);
                    await fsp.mkdir(recPath, { recursive: true });
                    for (let file of rec.files) {
                        const content = file.content || "";
                        await this.writeNewFiles(file, recPath, content, skipFileCheck);
                        delete file.content;
                    }
                }
            }
        }
        async _processManifest(manifest, skipFileCheckOnFileGeneration) {
            if (!skipFileCheckOnFileGeneration &&
                typeof skipFileCheckOnFileGeneration !== "boolean") {
                skipFileCheckOnFileGeneration = false;
            }
            const skipFileCheck = skipFileCheckOnFileGeneration;
            await this.createNewFiles(manifest, skipFileCheck);
            await this.writeManifestFile(manifest);
        }
        async downloadWithFiles(scope, skipFileCheck) {
            return new Promise((resolve, reject) => {
                server_1.getManifestWithFiles(scope)
                    .then(async (man) => {
                    try {
                        this._processManifest(man, skipFileCheck);
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                })
                    .catch(e => {
                    throw e;
                });
            });
        }
        async syncManifest() {
            try {
                let curManifest = await config_1.manifest;
                if (!curManifest) {
                    throw new Error("No manifest file loaded!");
                }
                let newManifest = await server_1.getManifest(curManifest.scope);
                this.writeManifestFile(newManifest);
                await this.reconcileDifferences(newManifest);
            }
            catch (e) {
                console.error(e);
            }
        }
        async reconcileDifferences(manifest) {
            try {
                let missing = await this.determineMissing(manifest);
                let missingFileMap = await server_1.getMissingFiles(missing);
                await this.loadMissingFiles(missingFileMap);
                console.log("sync complete!");
            }
            catch (e) {
                throw e;
            }
        }
        async determineMissing(manifest) {
            try {
                let missing = {};
                const { sourceDirectory = "src" } = (await config_1.config) || {};
                const _codeSrcPath = path_1.default.join(process.cwd(), sourceDirectory);
                const { tables } = manifest;
                //go through each table
                for (let tableName in tables) {
                    let table = tables[tableName];
                    let tablePath = path_1.default.join(_codeSrcPath, tableName);
                    try {
                        await fsp.access(tablePath, fs_1.default.constants.F_OK);
                    }
                    catch (e) {
                        this.noteMissingTable(missing, table, tableName);
                        continue;
                    }
                    //go through records
                    for (let recName in table.records) {
                        let record = table.records[recName];
                        let recPath = path_1.default.join(tablePath, recName);
                        try {
                            await fsp.access(recPath, fs_1.default.constants.F_OK);
                        }
                        catch (e) {
                            this.noteMissingRecord(missing, record, tableName);
                            continue;
                        }
                        //go through files
                        for (let file of record.files) {
                            let fileList = await fsp.readdir(recPath);
                            let matchingFiles = fileList.filter(f => {
                                let reg = new RegExp(file.name + ".*$");
                                return reg.test(f);
                            });
                            let exists = matchingFiles.length > 0;
                            if (!exists) {
                                this.noteMissingFile(missing, file, tableName, record);
                            }
                        }
                    }
                }
                return missing;
            }
            catch (e) {
                throw e;
            }
        }
        noteMissingFile(missingObj, file, tableName, record) {
            if (!missingObj.hasOwnProperty(tableName)) {
                missingObj[tableName] = {};
            }
            if (!missingObj[tableName].hasOwnProperty(record.sys_id)) {
                missingObj[tableName][record.sys_id] = [];
            }
            missingObj[tableName][record.sys_id].push({
                name: file.name,
                type: file.type
            });
        }
        noteMissingRecord(missingObj, record, tableName) {
            for (let file of record.files) {
                this.noteMissingFile(missingObj, file, tableName, record);
            }
        }
        noteMissingTable(missingObj, table, tableName) {
            for (let recName in table.records) {
                let record = table.records[recName];
                this.noteMissingRecord(missingObj, record, tableName);
            }
        }
        async loadMissingFiles(fileMap) {
            try {
                const { sourceDirectory = "src" } = (await config_1.config) || {};
                const _codeSrcPath = path_1.default.join(process.cwd(), sourceDirectory);
                for (let tableName in fileMap) {
                    let tablePath = path_1.default.join(_codeSrcPath, tableName);
                    let tableConfig = fileMap[tableName];
                    for (let recName in tableConfig.records) {
                        let recPath = path_1.default.join(tablePath, recName);
                        let record = tableConfig.records[recName];
                        try {
                            await fsp.access(recPath, fs_1.default.constants.F_OK);
                        }
                        catch (e) {
                            await fsp.mkdir(recPath, { recursive: true });
                        }
                        for (let file of record.files) {
                            let filePath = path_1.default.join(recPath, `${file.name}.${file.type}`);
                            await fsp.writeFile(filePath, file.content || "");
                        }
                    }
                }
            }
            catch (e) {
                throw new Error("failed to load missing files");
            }
        }
        async loaddir(dirPath, list) {
            try {
                let files = await fsp.readdir(dirPath);
                for (let f of files) {
                    let filep = path_1.default.join(dirPath, f);
                    let stats = await fsp.stat(filep);
                    if (stats.isDirectory()) {
                        await this.loaddir(filep, list);
                    }
                    else {
                        list.push(filep);
                    }
                }
            }
            catch (e) {
                return;
            }
        }
        async parseFileParams(files) {
            return await Utils.getParsedFilesPayload(files);
        }
        async loadList() {
            let list = [];
            const { sourceDirectory = "src" } = (await config_1.config) || {};
            let subDirectory = path_1.default.join(process.cwd(), sourceDirectory);
            await this.loaddir(subDirectory, list);
            return list;
        }
        async getLocalFilesList() {
            const files = await this.loadList();
            return this.parseFileParams(files);
        }
        async pushAllFiles() {
            let filePayload = await this.getLocalFilesList();
            const targetServer = process.env.SN_INSTANCE || "";
            if (!targetServer) {
                console.error("No server configured for push!");
                return;
            }
            await server_1.pushFiles(targetServer, filePayload);
        }
    }
    exports.default = new AppManager();
});
