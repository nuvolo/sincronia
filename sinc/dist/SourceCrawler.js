var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs_1 = __importDefault(require("fs"));
    const fsp = fs_1.default.promises;
});
// async function loaddir(dirPath: string, list: string[]) {
//   try {
//     let files = await fsp.readdir(dirPath);
//     for (let f of files) {
//       let filep = path.join(dirPath, f);
//       let stats = await fsp.stat(filep);
//       if (stats.isDirectory()) {
//         await loaddir(filep, list);
//       } else {
//         list.push(filep);
//       }
//     }
//   } catch (e) {
//     return;
//   }
// }
// async function _parseFileParams(files: string[]) {
//   return await Utils.getParsedFilesPayload(files);
// }
// async function loadList(startingDir: string): Promise<string[]> {
//   let list: string[] = [];
//   const { sourceDirectory = "src" } = (await config) || {};
//   let subDirectory = path.join(startingDir, sourceDirectory);
//   await loaddir(subDirectory, list);
//   return list;
// }
// export async function getLocalFilesList(startingDir: string) {
//   const files = await loadList(startingDir);
//   return _parseFileParams(files);
// }
