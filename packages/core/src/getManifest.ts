import { get, map, set, compact, forEach, includes } from "lodash";
import { baseUrlGQL, connGQL } from "./connection";
import fs from "fs";

type FileItem = {
  name: string;
  type: string;
};

type TableItem = {
  differentiatorField?: string | string[];
  displayField?: string;
  files?: FileItem[] | string[];
};

type TableData = Record<string, TableItem>;

type TableInfo = Record<
  string,
  {
    name: string;
    files: FileItem[];
    displayField: string;
    differentiatorField: string | string[];
    fields: string[];
  }
>;

type RecordItem = Record<string, { value: string; displayValue: string }>;

export const tableData: TableData = JSON.parse(
  fs.readFileSync("./scopes/sinc-conf.json", { encoding: "utf8" })
);

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
  const records = {};
  tableRecords.forEach((record) => {
    set(
      records,
      generateRecordName(record, differentiatorField, displayField),
      {
        files: files.map(({ name, type }) => ({ name, type })),
        name: generateRecordName(record, differentiatorField, displayField),
        sys_id: record.sys_id.value,
      }
    );
  });
  return records;
};

const getQuery = (tables: TableInfo, scope: string): string => `{
    query: GlideRecord_Query {
        ${map(
          tables,
          (table) => `${table.name}: ${
            table.name
          }(queryConditions: "sys_scope.scope=${scope}", pagination: {limit: 10000, offset: 0}) {
                list: _results {
                   ${table.fields.join(
                     "  { value, displayValue } "
                   )} { value, displayValue }
                }
              }`
        ).join(",")}
     }
   }`;

export const ng_getManifest = async (
  tables: TableData,
  scope: string
): Promise<any> => {
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
  const res = await connGQL.post(
    baseUrlGQL,
    { query: getQuery(tablesData, scope) },
    {}
  );
  const exclude = [
    "TT Product Client Script 1",
    "Tt Product Tt Order Client Script 1",
    "TT Product UI Action 1",
    "Tt Product Tt Order BR 1",
    "Tt Product Tt Order UI Action 1",
    "CopyScriptedRestApiUtils",
    "CopyTableUtils",
    "CopyScriptIncludesUtils",
    "DeviceSLPGenerateEventHandler",
  ];
  map(tablesData, ({ name, differentiatorField, files, displayField }) => {
    const tableRecords = get(res, `data.data.query.${name}.list`, []);
    if (tableRecords.length) {
      set(data, `tables.${name}`, {
        records: getScriptRecords({
          tableRecords: tableRecords.filter(
            (f: RecordItem) =>
              !includes(exclude, get(f, "name.displayValue", "") as string)
          ),
          displayField,
          differentiatorField,
          files,
        }),
      });
    }
  });
  //   console.log(JSON.stringify(get(res, `data.data.query`, [])));
  return JSON.parse(JSON.stringify(data, null, 4).replace(/_DOT_/g, "."));
};
