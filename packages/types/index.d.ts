export namespace Sinc {
  interface SharedCmdArgs {
    logLevel: string;
  }

  interface CmdDownloadArgs extends SharedCmdArgs {
    scope: string;
  }
  interface PushCmdArgs extends SharedCmdArgs {
    target?: string;
    diff: string;
    scopeSwap: boolean;
    updateSet: string;
    ci: boolean;
  }
  interface BuildCmdArgs extends SharedCmdArgs {
    diff: string;
  }
  interface Config {
    sourceDirectory: string;
    buildDirectory: string;
    rules?: PluginRule[];
    includes?: TablePropMap;
    excludes?: TablePropMap;
    tableOptions: ITableOptionsMap;
    refreshInterval: number;
  }

  interface ITableOptionsMap {
    [table: string]: ITableOptions;
  }

  interface ITableOptions {
    displayField?: string;
    differentiatorField?: string | string[];
    query: string;
  }

  interface FieldConfig {
    type: SN.FileType;
  }
  interface FieldMap {
    [fieldName: string]: FieldConfig;
  }
  interface TablePropMap {
    [table: string]: boolean | FieldMap;
  }
  interface PluginRule {
    match: RegExp;
    plugins: PluginConfig[];
  }
  interface PluginConfig {
    name: string;
    options: { [property: string]: any };
  }
  interface FileSyncParams {
    filePath: string;
    name: string;
    tableName: string;
    targetField: string;
    ext: string;
  }

  interface FileContext extends FileSyncParams {
    sys_id: string;
    scope: string;
    fileContents?: string;
  }

  interface ServerRequestConfig {
    url: string;
    data: string;
    method: string;
  }

  interface Plugin {
    run: PluginFunc;
  }

  interface PluginFunc {
    (context: FileContext, content: string, options: any): Promise<
      PluginResults
    >;
  }

  interface PluginResults {
    success: boolean;
    output: string;
  }

  type TransformResults = {
    success: boolean;
    content: string;
  };

  interface ScopeCheckResult {
    manifestScope: string;
    sessionScope: string;
    match: boolean;
  }
  interface LoginAnswers {
    instance: string;
    username: string;
    password: string;
  }

  interface AppSelectionAnswer {
    app: string;
  }

  interface DiffFile {
    changed: Array<string>;
  }

  type RecordContextMap = Record<string, FileContext>;
  type TableContextTree = Record<string, RecordContextMap>;
  type AppFileContextTree = Record<string, TableContextTree>;

  interface PushResult {
    success: boolean;
    message: string;
  }

  interface BuildResult extends PushResult {}

  type SuccessPromiseResult<T> = { status: "fulfilled"; value: T };
  type FailPromiseResult = { status: "rejected"; reason: any };
  type PromiseResult<T> = SuccessPromiseResult<T> | FailPromiseResult;

  interface SNAPIResponse<T> {
    result: T;
  }
}

export namespace SN {
  interface AppManifest {
    tables: TableMap;
    scope: string;
  }

  interface TableMap {
    [tableName: string]: TableConfig;
  }

  interface TableConfig {
    records: TableConfigRecords;
  }

  interface TableConfigRecords {
    [name: string]: MetaRecord;
  }

  interface MetaRecord {
    files: File[];
    name: string;
    sys_id: string;
  }

  interface File {
    name: string;
    type: FileType;
    content?: string;
  }

  interface Field {
    name: string;
    type: string;
  }

  interface Record {
    sys_id: string;
  }

  interface TableAPIResult {
    result: Record[];
  }

  type FileType = "js" | "css" | "xml" | "html" | "scss" | "txt";

  interface TypeMap {
    [type: string]: string;
  }

  interface MissingFileTableMap {
    [tableName: string]: MissingFileRecord;
  }
  interface MissingFileRecord {
    [sys_id: string]: File[];
  }
  interface ScopeObj {
    scope: string;
    sys_id: string;
  }
  interface App {
    scope: string;
    displayName: string;
    sys_id: string;
  }

  interface UserRecord {
    sys_id: string;
  }

  interface UserPrefRecord {
    sys_id: string;
  }

  interface ScopeRecord {
    sys_id: string;
  }

  interface UpdateSetRecord {
    sys_id: string;
  }
}

export type TSFIXME = any;
