import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const axiosConfig: AxiosRequestConfig = {
  withCredentials: true,
  auth: {
    username: process.env.SN_USER || "",
    password: process.env.SN_PASSWORD || ""
  },
  headers: {
    "Content-Type": "application/json"
  }
};

const api = axios.create(axiosConfig);

function _update(obj: AxiosRequestConfig) {
  const { url } = obj;
  api(obj)
    .then(resp => console.log("Successfully updated on server ", url))
    .catch(err => {
      console.error("The update request failed", err);
    });
}

function pushUpdate(requestObj: ServerRequestConfig) {
  if (requestObj && requestObj.data) {
    return _update(requestObj);
  }

  console.error(
    "Attempted to push an empty data object. No persistence for config",
    requestObj
  );
  return Promise.resolve();
}

const pushUpdates = (arrOfResourceConfig: ServerRequestConfig[]) => {
  arrOfResourceConfig.map(pushUpdate);
};

export function getManifestWithFiles(scope: string): Promise<SNAppManifest> {
  return new Promise((resolve, reject) => {
    let instance = process.env.SN_INSTANCE;
    let endpoint = `${instance}/api/x_nuvo_x/cicd/getManifestWithFiles/${scope}`;
    api
      .get(endpoint)
      .then(response => {
        resolve(response.data.result as SNAppManifest);
      })
      .catch(e => {
        reject(e);
      });
  });
}

function getManifest(scope: string): Promise<SNAppManifest> {
  return new Promise((resolve, reject) => {
    let instance = process.env.SN_INSTANCE;
    let endpoint = `${instance}/api/x_nuvo_x/cicd/getManifest/${scope}`;
    api
      .get(endpoint)
      .then(response => {
        resolve(response.data.result as SNAppManifest);
      })
      .catch(e => {
        reject(e);
      });
  });
}

async function getMissingFiles(
  missing: SNCDMissingFileTableMap
): Promise<SNTableMap> {
  let instance = process.env.SN_INSTANCE;
  let endpoint = `${instance}/api/x_nuvo_x/cicd/bulkDownload`;
  try {
    let response = await api.post(endpoint, missing);
    return response.data.result as SNTableMap;
  } catch (e) {
    throw e;
  }
}

export { pushUpdates, getManifest, pushUpdate, getMissingFiles };
