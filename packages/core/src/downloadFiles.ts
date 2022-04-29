import { SN } from "@sincronia/types";
import { keys, map, get, forEach, reduce } from "lodash";
import { tableData } from "./getManifest";
import { connection, baseUrlGQL } from "./services/connection";
import * as ConfigManager from "./config";
import { getGqlQuery, SingleQuery } from "./utils/graphQL";
import { constructEndpoint } from "./services/serviceNow";

export const ng_getMissingFiles = async (
  missingFiles: SN.MissingFileTableMap
): Promise<any> => {
  console.log("Get missing files via GQL request");
  const currentManifest = await ConfigManager.getManifest();
  const result: any = { result: {} };
  await forEach(
    missingFiles,
    async (missingRecord, table): Promise<any> => {
      const endpoint = constructEndpoint(table, {
        sysparm_query: {
          sys_id: { op: "IN", value: keys(missingRecord).join(",") },
        },
        sysparm_fields: [
          ...map(get(tableData, `${table}.files`, []), ({ name }) => name),
          "sys_id",
        ],
      });
      const td = await connection.get(endpoint);
      const list = td.data.result;
      forEach(list, (record) => {
        const res = findRecordInManifest(
          table,
          record.sys_id.value,
          currentManifest
        );
        if (res) {
          result.result[table][res.name] = {
            ...res,
            files: res.files.map((f: any) => ({
              ...f,
              content: record[f.name],
            })),
          };
        }
      });
      console.log(JSON.stringify(result));
      return false;
    }
  );
  //   data[0];
  //   console.log(data[0]);

  //   const queryData: SingleQuery[] = map(
  //     missingFiles,
  //     (missingRecord, table): SingleQuery => ({
  //       table,
  //       fields: [
  //         ...map(get(tableData, `${table}.files`, []), ({ name }) => name),
  //         "sys_id",
  //       ],
  //       conditions: `sys_idIN` + keys(missingRecord).join(","),
  //     })
  //   );
  //   const result: any = {
  //     result: {},
  //   };
  //   [queryData[0]].forEach(async (qd) => {
  //     const gqlQueryData = getGqlQuery([qd]);
  //     const res = await connection.post(baseUrlGQL, gqlQueryData, {});

  //     forEach(get(res, "data.data.query", {}), (data, table: string) => {
  //       if (!result.result[table]) {
  //         result.result[table] = {};
  //       }
  //       forEach(data.list, (record) => {
  //         const res = findRecordInManifest(
  //           table,
  //           record.sys_id.value,
  //           currentManifest
  //         );
  //         if (res) {
  //           result.result[table][res.name] = {
  //             ...res,
  //             files: res.files.map((f: any) => ({
  //               ...f,
  //               content: get(record, `${f.name}.value`, ""),
  //             })),
  //           };
  //         }
  //       });
  //       console.log(JSON.stringify(result));
  //     });
  //   });
  console.log("done");
  return {};
};

const findRecordInManifest = (
  table: string,
  sysId: string,
  manifest: any
): any => {
  const records = get(manifest, `tables.${table}.records`, {});
  return reduce(records, (res, rec) => (rec.sys_id === sysId ? rec : res), "");
};

// {
//     "result": {
//         "sysevent_script_action": {
//             "records": {
//                 "Update Device Normalized RS": {
//                     "name": "Update Device Normalized RS",
//                     "files": [
//                         {
//                             "name": "script",
//                             "type": "js",
//                             "content": "if (current.getValue('name') === 'risk_score_max_scale_value') {\n  NormalizedRiskScoreUtils.calculateDeviceNormalizedRS();\n}"
//                         }
//                     ],
//                     "sys_id": "0ef717c0db6cf0d015cfc082ba96192c"
//                 }
//             }
//         }
//     }
// }
