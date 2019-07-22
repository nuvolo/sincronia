import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { wait, chunkArr } from "./utils";
import { readFile } from "./PluginManager";
const axiosConfig: AxiosRequestConfig = {
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

const api = axios.create(axiosConfig);
const WAIT_TIME = 500;
const CHUNK_SIZE = 10;
const TABLE_API = "api/now/table";

async function _update(obj: AxiosRequestConfig) {
  try {
    let resp = await api(obj);
  } catch (e) {
    console.error("The update request failed", e);
  }
}

export async function pushUpdate(requestObj: Sinc.ServerRequestConfig) {
  if (requestObj && requestObj.data) {
    return _update(requestObj);
  }

  console.error(
    "Attempted to push an empty data object. No persistence for config",
    requestObj
  );
  return Promise.resolve();
}

export async function pushUpdates(
  arrOfResourceConfig: Sinc.ServerRequestConfig[]
) {
  await arrOfResourceConfig.map(pushUpdate);
}

export async function getManifestWithFiles(
  scope: string
): Promise<SN.AppManifest> {
  let endpoint = `api/x_nuvo_x/cicd/getManifestWithFiles/${scope}`;
  try {
    let response = await api.get(endpoint);
    return response.data.result as SN.AppManifest;
  } catch (e) {
    throw e;
  }
}

export async function getManifest(scope: string): Promise<SN.AppManifest> {
  let endpoint = `api/x_nuvo_x/cicd/getManifest/${scope}`;
  try {
    let response = await api.get(endpoint);
    return response.data.result as SN.AppManifest;
  } catch (e) {
    throw e;
  }
}

export async function getMissingFiles(
  missing: SN.MissingFileTableMap
): Promise<SN.TableMap> {
  let instance = process.env.SN_INSTANCE;
  let endpoint = `api/x_nuvo_x/cicd/bulkDownload`;
  try {
    let response = await api.post(endpoint, missing);
    return response.data.result as SN.TableMap;
  } catch (e) {
    throw e;
  }
}

function buildFileEndpoint(payload: Sinc.FileContext) {
  const { tableName, sys_id } = payload;
  return [TABLE_API, tableName, sys_id].join("/");
}

async function getFinalFileContents(filePayload: Sinc.FileContext) {
  let result = await readFile(filePayload);
  //console.log(result);
  return result;
}

async function buildFileRequestObj(
  target_server: string,
  filePayload: Sinc.FileContext
): Promise<Sinc.ServerRequestConfig> {
  const url = buildFileEndpoint(filePayload);
  const fileContents = await getFinalFileContents(filePayload);
  const { targetField } = filePayload;
  const data: any = {};
  data[targetField] = fileContents;
  return { url, data, method: "PATCH" };
}

export async function pushFiles(
  target_server: string,
  filesPayload: Sinc.FileContext[]
) {
  let chunks = chunkArr(filesPayload, CHUNK_SIZE);
  for (let chunk of chunks) {
    let results = chunk.map(ctx => {
      return pushFile(target_server, ctx);
    });
    await Promise.all(results);
    await wait(WAIT_TIME);
  }
}

export async function pushFile(
  target_server: string,
  fileContext: Sinc.FileContext
) {
  if (fileContext.sys_id && fileContext.targetField) {
    let requestObj = await buildFileRequestObj(target_server, fileContext);
    await pushUpdate(requestObj);
  }
}
