import { pushUpdate } from "./server";
import { readFile } from "./PluginManager";
//wait time in milliseconds between chunks on push
const WAIT_TIME = 500;
const TABLE_API = "api/now/table";

function _buildEndpoint(target_server: string, payload: SNCDFileContext) {
  const { tableName, sys_id } = payload;
  return [target_server, TABLE_API, tableName, sys_id].join("/");
}

async function _getFileContents(filePayload: SNCDFileContext) {
  let result = await readFile(filePayload);
  //console.log(result);
  return result;
}

async function _getRequestObj(
  target_server: string,
  filePayload: SNCDFileContext
): Promise<ServerRequestConfig> {
  const url = _buildEndpoint(target_server, filePayload);
  const fileContents = await _getFileContents(filePayload);
  const { targetField } = filePayload;
  const data: any = {};
  data[targetField] = fileContents;
  return { url, data, method: "PATCH" };
}

async function pushFiles(
  target_server: string,
  filesPayload: SNCDFileContext[]
) {
  let chunks = chunkArr(filesPayload, 10);
  for (let chunk of chunks) {
    let results = chunk.map(ctx => {
      return pushFile(target_server, ctx);
    });
    await Promise.all(results);
    await wait(WAIT_TIME);
  }
}

function wait(ms: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

function chunkArr(arr: any[], num: number) {
  let chunks = [];
  for (let i = 0; i < arr.length; i++) {
    chunks.push(arr.slice(i, i + num));
    i = i + num;
  }
  return chunks;
}

async function pushFile(target_server: string, fileContext: SNCDFileContext) {
  if (fileContext.sys_id && fileContext.targetField) {
    let requestObj = await _getRequestObj(target_server, fileContext);
    await pushUpdate(requestObj);
  }
}

export { pushFiles };
