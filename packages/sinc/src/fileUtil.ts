import Manifest from "./Manifest";
import fs from "fs";
import path from "path";
const fsp = fs.promises;

async function _getConfigFromPath(
  params: SNCDFileSyncParams
): Promise<SNCDFileContext | undefined> {
  try {
    const { tableName, name } = params;
    const { tables, scope } = await Manifest.getManifest();
    const { records } = tables[tableName];
    let sys_id = "";
    if (records.hasOwnProperty(name)) {
      sys_id = records[name].sys_id;
    }
    return Object.assign({}, params, { scope: scope, sys_id: sys_id });
  } catch (e) {
    return;
  }
}

async function _parseFileNameParams(filePath: string) {
  const ext = path.extname(filePath);
  const resourcePath = path.dirname(filePath).split(path.sep);
  const resources = resourcePath.slice(-3);
  const targetField = path.basename(filePath, ext);
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

// async function _parseFileParams(
//   arr: Promise<SNCDFileContext>[],
//   filePath: string
// ): Promise<SNCDFileContext[]> {
//   let res = await _parseFileNameParams(filePath);
//   if (res) {
//     arr.push(res);
//   }
//   return arr;
// }

async function getParsedFilesPayload(arr: string[]) {
  // const promises = arr.reduce(_parseFileParams, [] as Promise<
  //   SNCDFileContext
  // >[]);
  let results = [];
  for (let file of arr) {
    let res = await _parseFileNameParams(file);
    if (res) {
      results.push(res);
    }
  }
  return results;
  // return Promise.all(promises);
}

export { getParsedFilesPayload };
