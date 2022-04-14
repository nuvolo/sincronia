import { get, map, set, compact, forEach, includes } from "lodash";
import { baseUrlGQL, connection } from "./services/connection";
import fs from "fs";
import {
  TableData,
  FileItem,
  TableInfo,
  RecordItem,
  sincConfigDefault,
} from "./configs/sinc-config.default";
import { getGqlQuery } from "./utils/graphQL";

export const getSincConfig = (): TableData => {
  const localConfig = JSON.parse(
    fs.readFileSync("./sinc-conf.json", { encoding: "utf8" })
  );
  const config: TableData = {};
  forEach(localConfig, (cnf, t) => {
    if (cnf !== null) {
      config[t] = cnf;
    } else if (sincConfigDefault[t]) {
      config[t] = sincConfigDefault[t];
    } else {
      console.log(`Missing configuration for ${t}`);
    }
  });
  return config;
};

export const tableData = getSincConfig();

export const generateRecordName = (
  record: RecordItem,
  differentiatorField: string | string[],
  displayField: string
): string => {
  let recordName =
    get(record, "name.displayValue", "") ||
    get(record, "name.value", "") ||
    get(record, "sys_id.value", "");

  if (displayField !== "") {
    recordName = get(record, `${displayField}.displayValue`, "") as string;
  }
  if (differentiatorField) {
    if (typeof differentiatorField === "string") {
      recordName = `${recordName} (${get(
        record,
        `${differentiatorField}.displayValue`
      )})`;
    } else if (
      typeof differentiatorField === "object" &&
      differentiatorField.length
    ) {
      forEach(differentiatorField, (df) => {
        const value = get(record, `${df}.value`, "") as string;
        if (value && value !== "") {
          recordName += ` (${df}:${value})`;
          return false;
        }
      });
    }
  }
  if (!recordName || recordName === "") {
    recordName = get(record, `sys_id.value`, "") as string;
  }
  return (recordName as string)
    .replace(/[\/\\]/g, "〳")
    .replace(/\./g, "_DOT_");
};

const getScriptRecords = ({
  tableRecords,
  differentiatorField,
  files,
  displayField,
}: {
  tableRecords: RecordItem[];
  differentiatorField: string | string[];
  files: FileItem[];
  displayField: string;
}) => {
  const records: Record<
    string,
    { files: FileItem[]; sys_id: string; name: string }
  > = {};
  tableRecords.forEach((record) => {
    const name = generateRecordName(record, differentiatorField, displayField);
    records[name] = {
      files: files.map(({ name, type }) => ({ name, type })),
      name: name,
      sys_id: record.sys_id.value,
    };
  });
  return records;
};

const getTableDataQuery = (
  tables: TableInfo,
  scope: string
): { query: string } =>
  getGqlQuery(
    map(tables, ({ name, fields }) => ({
      table: name,
      fields,
      conditions: `sys_scope.scope=${scope}`,
      pagination: { limit: 10000 },
    }))
  );

export const ng_getManifest = async (
  tables: TableData,
  scope: string
): Promise<any> => {
  console.log("Get manifest via GraphQL request");
  const data = {
    tables: {},
  };
  const tablesData: TableInfo = {};
  map(tables, (t, k) => {
    const { differentiatorField = [], displayField = "", files = [] } = t;
    tablesData[k] = {
      name: k,
      files: map(
        files as any,
        (f: FileItem | string): FileItem =>
          typeof f === "object" ? f : { name: f, type: "js" }
      ),
      displayField,
      differentiatorField,
      fields: compact([
        ...(typeof differentiatorField === "object"
          ? [...differentiatorField]
          : [differentiatorField]),
        "name",
        "sys_id",
        displayField,
      ]),
    };
  });
  const res = await connection.post(
    baseUrlGQL,
    getTableDataQuery(tablesData, scope),
    {}
  );
  map(tablesData, ({ name, differentiatorField, files, displayField }) => {
    const tableRecords = get(res, `data.data.query.${name}.list`, []);
    if (tableRecords.length) {
      set(data, `tables.${name}`, {
        records: getScriptRecords({
          tableRecords,
          displayField,
          differentiatorField,
          files,
        }),
      });
    }
  });
  set(data, "scope", scope);
  // console.log(JSON.stringify(get(res, `data.data.query`, [])));
  // console.log(JSON.stringify(data, null, 4));
  // console.log(data);
  return data;
};
