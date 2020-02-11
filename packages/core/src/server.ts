import { SN, Sinc } from "@sincronia/types";
import axios, { AxiosRequestConfig, AxiosInstance } from "axios";
import { wait, chunkArr } from "./utils";
import PluginManager from "./PluginManager";
import { logger } from "./Logger";
import { config } from "./config";
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
    return await api(obj);
  } catch (e) {
    throw e;
  }
}

export async function pushUpdate(requestObj: Sinc.ServerRequestConfig) {
  try {
    if (requestObj && requestObj.data) {
      return _update(requestObj as AxiosRequestConfig);
    }
    logger.error("Attempted to push an empty data object");
  } catch (e) {
    throw e;
  }
}

export async function pushUpdates(
  arrOfResourceConfig: Sinc.ServerRequestConfig[]
) {
  await arrOfResourceConfig.map(pushUpdate);
}

export async function getManifestWithFiles(
  scope: string,
  creds?: SNInstanceCreds
): Promise<SN.AppManifest> {
  let endpoint = `api/x_nuvo_sinc/sinc/getManifestWithFiles/${scope}`;
  try {
    const { includes = {}, excludes = {}, tableOptions = {} } = await config;
    let response;
    if (creds) {
      let client = getBasicAxiosClient(creds);
      response = await client.post(endpoint, {
        includes,
        excludes,
        tableOptions
      });
    } else {
      response = await api.post(endpoint, { includes, excludes, tableOptions });
    }
    return response.data.result as SN.AppManifest;
  } catch (e) {
    throw e;
  }
}

export async function getManifest(scope: string): Promise<SN.AppManifest> {
  let endpoint = `api/x_nuvo_sinc/sinc/getManifest/${scope}`;
  try {
    const { includes = {}, excludes = {}, tableOptions = {} } = await config;
    let response = await api.post(endpoint, {
      includes,
      excludes,
      tableOptions
    });
    return response.data.result as SN.AppManifest;
  } catch (e) {
    throw e;
  }
}

export async function getMissingFiles(
  missingFiles: SN.MissingFileTableMap
): Promise<SN.TableMap> {
  let endpoint = `api/x_nuvo_sinc/sinc/bulkDownload`;
  try {
    const { tableOptions = {} } = await config;
    const payload = { missingFiles, tableOptions };
    let response = await api.post(endpoint, payload);
    return response.data.result as SN.TableMap;
  } catch (e) {
    throw e;
  }
}

function buildFileEndpoint(payload: Sinc.FileContext) {
  const { tableName, sys_id } = payload;
  return [TABLE_API, tableName, sys_id].join("/");
}

async function buildFileRequestObj(
  target_server: string,
  filePayload: Sinc.FileContext
): Promise<Sinc.ServerRequestConfig> {
  try {
    const url = buildFileEndpoint(filePayload);
    const fileContents = await PluginManager.getFinalFileContents(filePayload);
    const { targetField } = filePayload;
    const data: any = {};
    data[targetField] = fileContents;
    return { url, data, method: "PATCH" };
  } catch (e) {
    throw e;
  }
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
    try {
      let requestObj = await buildFileRequestObj(target_server, fileContext);
      let response = await pushUpdate(requestObj);
      if (response && response.status < 200 && response.status > 299) {
        throw new Error(response.statusText);
      }
    } catch (e) {
      throw e;
    }
  }
}

export async function getCurrentScope(): Promise<SN.ScopeObj> {
  let endpoint = "api/x_nuvo_sinc/sinc/getCurrentScope";
  try {
    let response = await api.get(endpoint);
    return response.data.result;
  } catch (e) {
    throw e;
  }
}

interface SNInstanceCreds {
  instance: string;
  user: string;
  password: string;
}

export async function getAppList(creds?: SNInstanceCreds): Promise<SN.App[]> {
  try {
    let endpoint = "api/x_nuvo_sinc/sinc/getAppList";
    let response;
    if (creds) {
      let client = getBasicAxiosClient(creds);
      response = await client.get(endpoint);
    } else {
      response = await api.get(endpoint);
    }
    let apps: SN.App[] = response.data.result;
    return apps;
  } catch (e) {
    throw e;
  }
}

function getBasicAxiosClient(creds: SNInstanceCreds) {
  let serverString = creds.instance || "NO_INSTANCE";
  return axios.create({
    withCredentials: true,
    auth: {
      username: creds.user,
      password: creds.password
    },
    baseURL: `https://${serverString}/`
  });
}
