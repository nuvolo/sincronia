import Manifest from "./Manifest";
const fs = require("fs");
const path = require("path");
const fsp = fs.promises;

async function _getConfigFromPath(
  params: SNCDFileSyncParams
): Promise<SNCDFileContext> {
  const { tableName, name } = params;
  const { tables, scope } = await Manifest.getManifest();
  const { records } = tables[tableName];
  let sys_id = "";
  if (records.hasOwnProperty(name)) {
    sys_id = records[name].sys_id;
  }
  return Object.assign({}, params, { scope: scope, sys_id: sys_id });
}

async function _parseFileNameParams(filePath: string) {
  const ext = path.extname(filePath);
  const resourcePath = path.dirname(filePath).split("/");
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

async function _parseFileParams(filePath: string): Promise<SNCDFileContext> {
  return await _parseFileNameParams(filePath);
}

function getParsedFilesPayload(arr: string[]) {
  const promises = arr.map(filePath => _parseFileParams(filePath));
  return Promise.all(promises);
}

export { getParsedFilesPayload };
