import { SN, Sinc } from "@sincronia/types";
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
      if (!fieldExists(records[name], params)) {
        throw new Error(
          `${params.targetField} not found in the manifest for ${records[name].name}`
        );
      }
      return Object.assign({}, params, { scope: scope, sys_id: sys_id });
    } else {
      throw new Error(`Cannot find record called ${name} in ${tableName}`);
    }
  } catch (e) {
    return;
  }
}

function fieldExists(record: SN.MetaRecord, context: Sinc.FileSyncParams) {
  let matches = record.files.filter(cur => {
    return cur.name === context.targetField;
  });
  return matches.length === 1;
}

function getExtension(filePath: string) {
  try {
    let ext =
      "." +
      path
        .basename(filePath)
        .split(".")
        .slice(1)
        .join(".");
    return ext;
  } catch (e) {
    return "";
  }
}

export async function parseFileNameParams(filePath: string) {
  const ext = getExtension(filePath);
  const resourcePath = path.dirname(filePath).split(path.sep);
  const resources = resourcePath.slice(-3);
  let targetField = path.basename(filePath, ext);
  const tableName = resources[1];
  const name = resources[2];
  if (tableName === "sys_atf_step") targetField = "inputs.script";
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

export function chunkArr(
  arr: Sinc.FileContext[],
  chunkSize: number
): Sinc.FileContext[][] {
  const numChunks = Math.ceil(arr.length / chunkSize);
  const chunks: Sinc.FileContext[][] = [];
  for (let i = 0; i < numChunks; i++) {
    const rangeBegin = i * chunkSize;
    const rangeEnd =
      rangeBegin + chunkSize > arr.length ? arr.length : rangeBegin + chunkSize;
    chunks.push(arr.slice(rangeBegin, rangeEnd));
  }
  return chunks;
}
