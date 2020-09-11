import { Sinc } from "@sincronia/types";
import axios, { AxiosResponse } from "axios";
import rateLimit from "axios-rate-limit";
import { wait } from "./utils";

export const retryOnErr = async <T>(
  f: () => Promise<T>,
  allowedRetries: number,
  msBetween = 0
): Promise<T> => {
  try {
    return await f();
  } catch (e) {
    const newRetries = allowedRetries - 1;
    if (newRetries <= 0) {
      throw e;
    }
    await wait(msBetween);
    return retryOnErr(f, newRetries, msBetween);
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

  return {
    updateRecord
  };
};

export const defaultClient = () => {
  const { SN_USER = "", SN_PASSWORD = "", SN_INSTANCE = "" } = process.env;
  return snClient(`https://${SN_INSTANCE}/`, SN_USER, SN_PASSWORD);
};
