import { SN } from "@sincronia/types";
import { get, map, isEmpty } from "lodash";
import { connection } from "./connection";

type SysParams = {
  sysparm_query?: Record<string, string | { op: string; value: string }>;
  sysparm_fields?: string[];
};

const constructEndpoint = (table: string, params: SysParams): string => {
  const sysparm_query = get(params, "sysparm_query", {});
  const sysparm_fields = get(params, "sysparm_fields", []);
  const urlParams = [];
  if (!isEmpty(sysparm_query)) {
    urlParams.push(
      `sysparm_query=` +
        map(
          sysparm_query || {},
          (v, k) =>
            `${k}` + (typeof v === "object" ? `${v.op}${v.value}` : `=${v}`)
        ).join("^")
    );
  }
  if (!isEmpty(sysparm_fields.length)) {
    urlParams.push(`sysparm_fields=` + sysparm_fields?.join(","));
  }
  return `api/now/table/${table}?${urlParams.join("&")}`;
};

export const ng_getCurrentScope = async (): Promise<SN.ScopeObj> => {
  const { SN_USER: username = "" } = process.env;
  const endpoint = constructEndpoint("sys_user_preference", {
    sysparm_query: {
      "user.user_name": username,
      name: "apps.current_app",
    },
  });
  const profileScopeSetting = await connection.get(endpoint);
  const appId = get(profileScopeSetting, "data.result[0].value", "");
  if (appId) {
    const scopeData = await connection.get(`api/now/table/sys_app/${appId}`);
    return {
      scope: get(scopeData, "data.result.scope", ""),
      sys_id: get(scopeData, "data.result.sys_id", ""),
    };
  }
  return { scope: "", sys_id: "" };
};
