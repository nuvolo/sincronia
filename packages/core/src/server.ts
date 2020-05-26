import { SN, Sinc } from "@sincronia/types";
import axios, { AxiosRequestConfig, AxiosInstance } from "axios";
import { wait, chunkArr } from "./utils";
import PluginManager from "./PluginManager";
import { logger } from "./Logger";
import { config } from "./config";
import ProgressBar from "progress";

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
  filePayload: Sinc.FileContext,
  processFile: boolean = true
): Promise<Sinc.ServerRequestConfig> {
  try {
    const url = buildFileEndpoint(filePayload);
    const fileContents = await PluginManager.getFinalFileContents(
      filePayload,
      processFile
    );
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
  filesPayload: Sinc.FileContext[],
  processFile: boolean = true
) {
  const resultSet: boolean[] = [];
  let progBar: ProgressBar | undefined;
  if (logger.getLogLevel() === "info") {
    progBar = new ProgressBar(":bar :current/:total (:percent)", {
      total: filesPayload.length,
      width: 60
    });
  }
  let chunks = chunkArr(filesPayload, CHUNK_SIZE);
  logger.silly(`${chunks.length} chunks of ${CHUNK_SIZE}`);
  for (let chunk of chunks) {
    let resultsPromises = chunk.map(ctx => {
      const pushPromise = pushFile(target_server, ctx, processFile);
      pushPromise
        .then(() => {
          if (progBar) {
            progBar.tick();
          }
        })
        .catch(() => {
          if (progBar) {
            progBar.tick();
          }
        });
      return pushPromise;
    });
    const results = await Promise.all(resultsPromises);
    resultSet.push(...results);
    await wait(WAIT_TIME);
  }
  return resultSet;
}

export async function pushFile(
  target_server: string,
  fileContext: Sinc.FileContext,
  processFile: boolean = true
): Promise<boolean> {
  const fileSummary = `${fileContext.tableName}/${fileContext.name}(${fileContext.sys_id})`;
  if (fileContext.sys_id && fileContext.targetField) {
    try {
      let requestObj = await buildFileRequestObj(
        target_server,
        fileContext,
        processFile
      );
      let response = await pushUpdate(requestObj);
      logger.debug(`Attempting to push ${fileSummary}`);
      if (response) {
        if (response.status === 404) {
          logger.error(`Could not find ${fileSummary} on the server.`);
          return false;
        }
        if (response.status < 200 && response.status > 299) {
          logger.error(
            `Failed to push ${fileSummary}. Recieved an unexpected response (${response.status})`
          );
          logger.debug(JSON.stringify(response, null, 2));
          return false;
        }
        logger.debug(`${fileSummary} pushed successfully!`);
        return true;
      }
      logger.error(`No response object ${fileSummary}`);
      return false;
    } catch (e) {
      logger.error(`Failed to push ${fileSummary}`);
      console.error(e);
      return false;
    }
  }
  logger.error(
    `Failed to push ${fileSummary}, missing either a target field or sys_id`
  );
  return false;
}

export async function deployFiles(
  target_server: string,
  filesPayload: Sinc.FileContext[]
) {
  return await pushFiles(target_server, filesPayload, false);
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

export async function swapServerScope(
  scopeId: string,
  updateSetName: string = ""
): Promise<void> {
  try {
    const userSysId = await getUserSysId();
    const curAppUserPrefId = await getCurrentAppUserPrefSysId(userSysId);
    // If not user pref record exists, create it.
    if (curAppUserPrefId !== "") {
      await updateCurrentAppUserPref(scopeId, curAppUserPrefId);
    } else {
      await createCurrentAppUserPref(scopeId, userSysId);
    }
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function getScopeId(scopeName: string): Promise<string> {
  try {
    const endpoint = "api/now/table/sys_scope";
    let response = await api.get(endpoint, {
      params: {
        sysparm_query: `scope=${scopeName}`,
        sysparm_fields: "sys_id"
      }
    });
    logger.debug(`getScopeId.response = ${JSON.stringify(response.data)}`);
    return response.data.result[0].sys_id;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function getUserSysId(
  userName: string = process.env.SN_USER as string
): Promise<string> {
  try {
    const endpoint = "api/now/table/sys_user";
    let response = await api.get(endpoint, {
      params: {
        sysparm_query: `user_name=${userName}`,
        sysparm_fields: "sys_id"
      }
    });
    return response.data.result[0].sys_id;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function getCurrentAppUserPrefSysId(
  userSysId: string
): Promise<string> {
  try {
    const endpoint = `api/now/table/sys_user_preference`;
    let response = await api.get(endpoint, {
      params: {
        sysparm_query: `user=${userSysId}^name=apps.current_app`,
        sysparm_fields: "sys_id"
      }
    });
    logger.debug(
      `getCurrentAppUserPrefSysId.response = ${JSON.stringify(response.data)}`
    );
    if (response.data.result.length > 0) {
      return response.data.result[0].sys_id;
    } else {
      return "";
    }
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function updateCurrentAppUserPref(
  appSysId: string,
  userPrefSysId: string
): Promise<void> {
  try {
    const endpoint = `api/now/table/sys_user_preference/${userPrefSysId}`;
    await api.put(endpoint, { value: appSysId });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function createCurrentAppUserPref(
  appSysId: string,
  userSysId: string
): Promise<void> {
  try {
    const endpoint = `api/now/table/sys_user_preference`;
    await api.post(endpoint, {
      value: appSysId,
      name: "apps.current_app",
      type: "string",
      user: userSysId
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function getCurrentUpdateSetUserPref(
  userSysId: string
): Promise<string> {
  try {
    const endpoint = `api/now/table/sys_user_preference`;
    let response = await api.get(endpoint, {
      params: {
        sysparm_query: `user=${userSysId}^name=sys_update_set`,
        sysparm_fields: "sys_id"
      }
    });
    return response.data.result[0].sys_id;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function updateCurrentUpdateSetUserPref(
  updateSetSysId: string,
  userPrefSysId: string
): Promise<void> {
  try {
    const endpoint = `api/now/table/sys_user_preference/${userPrefSysId}`;
    await api.put(endpoint, { value: updateSetSysId });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function createCurrentUpdateSetUserPref(
  updateSetSysId: string,
  userSysId: string
): Promise<void> {
  try {
    const endpoint = `api/now/table/sys_user_preference`;
    await api.put(endpoint, {
      value: updateSetSysId,
      name: "sys_update_set",
      type: "string",
      user: userSysId
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

export async function createUpdateSet(updateSetName: string): Promise<string> {
  try {
    const endpoint = `api/now/table/sys_update_set`;
    const response = await api.post(endpoint, {
      name: updateSetName
    });
    return response.data.result.sys_id;
  } catch (e) {
    logger.error(e);
    throw e;
  }
}
