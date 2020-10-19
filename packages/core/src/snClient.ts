import { Sinc } from "@sincronia/types";
import axios, { AxiosPromise, AxiosResponse } from "axios";
import rateLimit from "axios-rate-limit";
import { wait } from "./genericUtils";
import { logger } from "./Logger";

export const retryOnErr = async <T>(
  f: () => Promise<T>,
  allowedRetries: number,
  msBetween = 0,
  onRetry?: (retriesLeft: number) => void
): Promise<T> => {
  try {
    return await f();
  } catch (e) {
    const newRetries = allowedRetries - 1;
    if (newRetries <= 0) {
      throw e;
    }
    if (onRetry) {
      onRetry(newRetries);
    }
    await wait(msBetween);
    return retryOnErr(f, newRetries, msBetween, onRetry);
  }
};

export const processPushResponse = (
  response: AxiosResponse,
  recSummary: string
): Sinc.PushResult => {
  const { status } = response;
  if (status === 404) {
    return {
      success: false,
      message: `Could not find ${recSummary} on the server.`
    };
  }
  if (status < 200 || status > 299) {
    return {
      success: false,
      message: `Failed to push ${recSummary}. Recieved an unexpected response (${status})`
    };
  }
  return {
    success: true,
    message: `${recSummary} pushed successfully!`
  };
};

export const snClient = (
  baseURL: string,
  username: string,
  password: string
) => {
  const client = rateLimit(
    axios.create({
      withCredentials: true,
      auth: {
        username,
        password
      },
      headers: {
        "Content-Type": "application/json"
      },
      baseURL
    }),
    { maxRPS: 20 }
  );

  const getAppList = ()  => {
      let endpoint = "api/x_nuvo_sinc/sinc/getAppList";
      return client.get(endpoint);
  }

  const updateATFfile = (contents: string, sysId: string) => {
    const endpoint = "api/x_nuvo_sinc/pushATFfile";
    try {
      return client.post(endpoint, { file: contents, sys_id: sysId });
    } catch (e) {
      throw e;
    }
  };

  const updateRecord = (
    table: string,
    recordId: string,
    fields: Record<string, string>
  ) => {
    if (table === "sys_atf_step") {
      updateATFfile(fields["inputs.script"], recordId);
    }
    const endpoint = `api/now/table/${table}/${recordId}`;
    return client.patch(endpoint, fields);
  };

  const getScopeId = (scopeName: string) => {
    const endpoint = "api/now/table/sys_scope";
    return client.get(endpoint, {
      params: {
        sysparm_query: `scope=${scopeName}`,
        sysparm_fields: "sys_id"
      }
    });
  };

  const getUserSysId =  (
    userName: string = process.env.SN_USER as string
  ) => {
    const endpoint = "api/now/table/sys_user";
    return client.get(endpoint, {
      params: {
        sysparm_query: `user_name=${userName}`,
        sysparm_fields: "sys_id"
      }
    });
  }
  const getCurrentAppUserPrefSysId = (userSysId: string) => {
    const endpoint = `api/now/table/sys_user_preference`;
    return client.get(endpoint, {
        params: {
          sysparm_query: `user=${userSysId}^name=apps.current_app`,
          sysparm_fields: "sys_id"
        }
      });
  };

  const updateCurrentAppUserPref = (
    appSysId: string,
    userPrefSysId: string
  ) => {
    const endpoint = `api/now/table/sys_user_preference/${userPrefSysId}`;
    return client.put(endpoint, { value: appSysId });
  };

  const createCurrentAppUserPref = (appSysId: string, userSysId: string) => {
    const endpoint = `api/now/table/sys_user_preference`;
    return client.post(endpoint, {
      value: appSysId,
      name: "apps.current_app",
      type: "string",
      user: userSysId
    });
  };

  const getCurrentScope = () => {
    let endpoint = "api/x_nuvo_sinc/sinc/getCurrentScope";
    return client.get(endpoint)
  };

  const createUpdateSet = (updateSetName: string)=> {
      const endpoint = `api/now/table/sys_update_set`;
      return client.post(endpoint, {
        name: updateSetName
      });
  }

  const getCurrentUpdateSetUserPref = (
    userSysId: string
  )=> {
      const endpoint = `api/now/table/sys_user_preference`;
      return client.get(endpoint, {
        params: {
          sysparm_query: `user=${userSysId}^name=sys_update_set`,
          sysparm_fields: "sys_id"
        }
  });
}
const updateCurrentUpdateSetUserPref = (
  updateSetSysId: string,
  userPrefSysId: string
) => {
    const endpoint = `api/now/table/sys_user_preference/${userPrefSysId}`;
    return client.put(endpoint, { value: updateSetSysId });
}

const createCurrentUpdateSetUserPref =(
  updateSetSysId: string,
  userSysId: string
) => {
    const endpoint = `api/now/table/sys_user_preference`;
    return client.put(endpoint, {
      value: updateSetSysId,
      name: "sys_update_set",
      type: "string",
      user: userSysId
    });
}

  return {
    getAppList,
    updateRecord,
    getScopeId,
    getUserSysId,
    getCurrentAppUserPrefSysId,
    updateCurrentAppUserPref,
    createCurrentAppUserPref,
    getCurrentScope,
    createUpdateSet,
    getCurrentUpdateSetUserPref,
    updateCurrentUpdateSetUserPref,
    createCurrentUpdateSetUserPref
  };
};

export const defaultClient = () => {
  const { SN_USER = "", SN_PASSWORD = "", SN_INSTANCE = "" } = process.env;
  return snClient(`https://${SN_INSTANCE}/`, SN_USER, SN_PASSWORD);
};

export const processSimpleResponse = async(clientPromise: AxiosPromise<any>, returnField?:string) =>{
  try{
    return await clientPromise.then(result =>{
      if(returnField) return result.data[0][returnField];
      else return result.data;
    });
  }catch(e){
    logger.error("Error processing server response");
    logger.error(e);
    throw e;
  }
}