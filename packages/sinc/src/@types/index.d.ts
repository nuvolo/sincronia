interface ServerRequestConfig {
  url: string;
  data: string;
  method: string;
}

interface SNRecord {
  sys_id: string;
}

interface TableAPIResult {
  result: SNRecord[];
}

//scope
//table name (real name or display)
//record names (display)
//files for the record (record name.extension fieldname.extension record_fieldname.extension)
type FileType = "js" | "css" | "xml" | "html" | "scss";

interface SNAppManifest {
  tables: SNTableMap;
  scope: string;
}

interface SNTableMap {
  [tableName: string]: SNTableConfig;
}

interface SNTableConfig {
  records: SNTableConfigRecords;
}

interface SNTableConfigRecords {
  [name: string]: SNMetaRecord;
}

interface SNMetaRecord {
  files: SNFile[];
  name: string;
  sys_id: string;
}

interface SNFile {
  /**
   * Name of the field in Servicenow
   *
   * @type {string}
   * @memberof SNFile
   */
  name: string;
  type: FileType;
  content?: string;
}

interface SNField {
  name: string;
  type: string;
}

interface SNCDConfig {
  ignoreDirectories: string[];
  sourceDirectory: string;
  rules?: SNCDPluginRule[];
}

interface SNCDPluginRule {
  match: string;
  plugins: SNCDPluginConfig[];
}

interface SNCDPluginConfig {
  name: string;
  options: { [property: string]: any };
}

interface TypeMap {
  [type: string]: string;
}

interface SNCDFileSyncParams {
  filePath: string;
  name: string;
  tableName: string;
  targetField: string;
  ext: string;
}

interface SNCDFileContext extends SNCDFileSyncParams {
  sys_id: string;
  scope: string;
  fileContents?: string;
}

interface SNCDPlugin {
  run: SNCDPluginFunc;
}

interface SNCDPluginFunc {
  (context: SNCDFileContext, content: string, options: any): SNCDPluginResults;
}

interface SNCDPluginResults {
  success: boolean;
  output: string;
}

type SNCDTransformResults = {
  success: boolean;
  content: string;
};

interface SNCDMissingFileTableMap {
  [tableName: string]: SNCDMissingFileRecord;
}

interface SNCDMissingFileRecord {
  [sys_id: string]: SNFile[];
}
