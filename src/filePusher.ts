import { pushUpdate } from "./server";
import { readFile } from "./PluginManager";

const TABLE_API = "api/now/table";

function _buildEndpoint(target_server: string, payload: SNCDFileContext) {
  const { tableName, sys_id } = payload;
  return [target_server, TABLE_API, tableName, sys_id].join("/");
}

async function _getFileContents(filePayload: SNCDFileContext) {
  let result = await readFile(filePayload);
  console.log(result);
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

function pushFiles(target_server: string, filesPayload: SNCDFileContext[]) {
  filesPayload.map(async payload => {
    if (payload.sys_id && payload.targetField) {
      const requestObj: ServerRequestConfig = await _getRequestObj(
        target_server,
        payload
      );

      pushUpdate(requestObj);
    }
  });
}

async function pushFile(target_server: string, fileContext: SNCDFileContext) {
  if (fileContext.sys_id && fileContext.targetField) {
    let requestObj = await _getRequestObj(target_server, fileContext);
    pushUpdate(requestObj);
  }
}

export { pushFiles };
