import { manifest } from "./config";
import path from "path";

async function _getConfigFromPath(
  params: Sinc.FileSyncParams
): Promise<Sinc.FileContext | undefined> {
  try {
    let curManifest = await manifest;
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
  } catch (e) {
    return;
  }
}

export async function parseFileNameParams(filePath: string) {
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

export async function getParsedFilesPayload(arr: string[]) {
  let results = [];
  for (let file of arr) {
    let res = await parseFileNameParams(file);
    if (res) {
      results.push(res);
    }
  }
  return results;
}

export function wait(ms: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

export function chunkArr(arr: any[], num: number) {
  let chunks = [];
  for (let i = 0; i < arr.length; i++) {
    chunks.push(arr.slice(i, i + num));
    i = i + num;
  }
  return chunks;
}
