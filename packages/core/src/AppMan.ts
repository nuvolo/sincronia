import { SN } from "@sincronia/types";
import {
  createDirRecursively,
  writeSNFileIfNotExists,
  writeFileForce,
  pathExists,
  appendToPath,
  SNFileExists
} from "./FileUtils";
import path from "path";
import ConfigManager from "./config";

const processFilesInManRec = async (recPath: string, rec: SN.MetaRecord) => {
  const filePromises = rec.files.map(file =>
    writeSNFileIfNotExists(file, recPath)
  );
  await Promise.all(filePromises);
  // Side effect, remove content from files so it doesn't get written to manifest
  rec.files.forEach(file => {
    delete file.content;
  });
};

const processRecsInManTable = async (
  tablePath: string,
  table: SN.TableConfig
) => {
  const { records } = table;
  const recKeys = Object.keys(records);
  const recKeyToPath = (key: string) => path.join(tablePath, records[key].name);
  const recPathPromises = recKeys.map(recKeyToPath).map(createDirRecursively);
  await Promise.all(recPathPromises);

  const filePromises = recKeys.reduce(
    (acc: Promise<void>[], recKey: string) => {
      return [
        ...acc,
        processFilesInManRec(recKeyToPath(recKey), records[recKey])
      ];
    },
    [] as Promise<void>[]
  );
  return Promise.all(filePromises);
};

const processTablesInManifest = async (manifest: SN.AppManifest) => {
  const { tables } = manifest;
  const tableNames = Object.keys(tables);
  const tablePromises = tableNames.map(tableName => {
    return processRecsInManTable(
      path.join(ConfigManager.getSourcePath(), tableName),
      tables[tableName]
    );
  });
  await Promise.all(tablePromises);
};

export const processManifest = async (manifest: SN.AppManifest) => {
  await processTablesInManifest(manifest);
  await writeFileForce(
    ConfigManager.getManifestPath(),
    JSON.stringify(manifest, null, 2)
  );
};

const markFileMissing = (missingObj: SN.MissingFileTableMap) => (
  table: string
) => (recordId: string) => (file: SN.File) => {
  if (!missingObj[table]) {
    missingObj[table] = {};
  }
  if (!missingObj[table][recordId]) {
    missingObj[table][recordId] = [];
  }
  const { name, type } = file;
  missingObj[table][recordId].push({ name, type });
};
type MarkTableMissingFunc = ReturnType<typeof markFileMissing>;
type MarkRecordMissingFunc = ReturnType<MarkTableMissingFunc>;
type MarkFileMissingFunc = ReturnType<MarkRecordMissingFunc>;

const markRecordMissing = (
  record: SN.MetaRecord,
  missingFunc: MarkRecordMissingFunc
) => {
  record.files.forEach(file => {
    missingFunc(record.sys_id)(file);
  });
};

const markTableMissing = (
  table: SN.TableConfig,
  tableName: string,
  missingFunc: MarkTableMissingFunc
) => {
  Object.keys(table.records).forEach(recName => {
    markRecordMissing(table.records[recName], missingFunc(tableName));
  });
};

const checkFilesForMissing = async (
  recPath: string,
  files: SN.File[],
  missingFunc: MarkFileMissingFunc
) => {
  const checkPromises = files.map(SNFileExists(recPath));
  const checks = await Promise.all(checkPromises);
  checks.forEach((check, index) => {
    if (!check) {
      missingFunc(files[index]);
    }
  });
};

const checkRecordsForMissing = async (
  tablePath: string,
  records: SN.TableConfigRecords,
  missingFunc: MarkRecordMissingFunc
) => {
  const recNames = Object.keys(records);
  const recPaths = recNames.map(appendToPath(tablePath));
  const checkPromises = recNames.map((recName, index) =>
    pathExists(recPaths[index])
  );
  const checks = await Promise.all(checkPromises);
  checks.forEach((check, index) => {
    const recName = recNames[index];
    const record = records[recName];
    if (!check) {
      markRecordMissing(record, missingFunc);
      return;
    }
    checkFilesForMissing(
      recPaths[index],
      record.files,
      missingFunc(record.sys_id)
    );
  });
};

const checkTablesForMissing = async (
  topPath: string,
  tables: SN.TableMap,
  missingFunc: MarkTableMissingFunc
) => {
  const tableNames = Object.keys(tables);
  const tablePaths = tableNames.map(appendToPath(topPath));
  const checkPromises = tableNames.map((tableName, index) =>
    pathExists(tablePaths[index])
  );
  const checks = await Promise.all(checkPromises);
  checks.forEach((check, index) => {
    const tableName = tableNames[index];
    if (!check) {
      markTableMissing(tables[tableName], tableName, missingFunc);
      return;
    }
    checkRecordsForMissing(
      tablePaths[index],
      tables[tableName].records,
      missingFunc(tableName)
    );
  });
};

export const findMissingFiles = async (
  manifest: SN.AppManifest
): Promise<SN.MissingFileTableMap> => {
  const missing: SN.MissingFileTableMap = {};
  const { tables } = manifest;
  const missingTableFunc = markFileMissing(missing);
  await checkTablesForMissing(
    ConfigManager.getSourcePath(),
    tables,
    missingTableFunc
  );

  return missing;
};
