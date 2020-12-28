import { Sinc } from "@sincronia/types";
import axios, { AxiosRequestConfig } from "axios";
import { wait, chunkArr } from "./genericUtils";
import PluginManager from "./PluginManager";
import { logger } from "./Logger";
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
const NETWORK_RETRIES = 3;
const TABLE_API = "api/now/table";
const NETWORK_TIMEOUT = 3000;

/*
  Function is only used in function below
  Roll into buildFileRequestObj?
  Breyton: This function is probably useless now
*/
function buildFileEndpoint(payload: Sinc.FileContext) {
  const { tableName, sys_id } = payload;
  return [TABLE_API, tableName, sys_id].join("/");
}

/*
  Util function in SN Client
  Breyton: This function is probably useless now
*/
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
    let data: any = {};
    data[targetField] = fileContents;
    if (filePayload.tableName === "sys_atf_step") data = fileContents;
    return { url, data, method: "PATCH" };
  } catch (e) {
    throw e;
  }
}

/*
  Following several functions only used for deploy. Clean up and move to appUtils
  Breyton: Should be able to leverage the same endpoints used for the new push in snClient to accomplish the same task
*/
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
  processFile: boolean = true,
  devMode: boolean = false,
  retries: number = 0
): Promise<boolean> {
  const fileSummary = `${fileContext.tableName}/${fileContext.name}(${fileContext.sys_id})`;
  if (fileContext.sys_id && fileContext.targetField) {
    try {
      let requestObj = await buildFileRequestObj(
        target_server,
        fileContext,
        processFile
      );
      let response =
        // fileContext.tableName === "sys_atf_step"
        // ? await defaultClient().updateATFfile(requestObj.data, fileContext.sys_id)
        await pushUpdate(requestObj);
      /*
      requires rewrite based on new push
    */

      logger.debug(`Attempting to push ${fileSummary}`);
      if (response) {
        if (response.status === 404) {
          logger.error(`Could not find ${fileSummary} on the server.`);
          return false;
        }
        if (response.status < 200 || response.status > 299) {
          logger.error(
            `Failed to push ${fileSummary}. Recieved an unexpected response (${response.status})`
          );
          if (devMode || retries === NETWORK_RETRIES) {
            logger.debug(JSON.stringify(response, null, 2));
          }
          throw new Error();
        }
        logger.debug(`${fileSummary} pushed successfully!`);
        return true;
      }
      logger.error(`No response object ${fileSummary}`);
      return false;
    } catch (e) {
      logger.error(`Failed to push ${fileSummary}`);
      if (!devMode && retries < NETWORK_RETRIES) {
        logger.info(`Retrying to push ${fileSummary}. Retries: ${retries + 1}`);
        await wait(NETWORK_TIMEOUT);
        return await pushFile(
          target_server,
          fileContext,
          processFile,
          devMode,
          retries + 1
        );
      } else {
        logger.info(`Maximum retries reached for ${fileSummary}`);
        console.error(e);
        throw new Error();
      }
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

/*
  Move to SN sincronia types
  Breyton: Probably a useless type once migration to snClient is complete
*/
interface SNInstanceCreds {
  instance: string;
  user: string;
  password: string;
}
