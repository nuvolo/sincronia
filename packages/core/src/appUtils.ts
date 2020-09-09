import { SN, Sinc } from "@sincronia/types";
import path from "path";
import * as fUtils from "./FileUtils";
import * as SNClient from "./server";
import ConfigManager from "./config";

const processFilesInManRec = async (
  recPath: string,
  rec: SN.MetaRecord,
  forceWrite: boolean
) => {
  const fileWrite = fUtils.writeSNFileCurry(forceWrite);
  const filePromises = rec.files.map(file => fileWrite(file, recPath));
  await Promise.all(filePromises);
  // Side effect, remove content from files so it doesn't get written to manifest
  rec.files.forEach(file => {
    delete file.content;
  });
};

const processRecsInManTable = async (
  tablePath: string,
  table: SN.TableConfig,
  forceWrite: boolean
) => {
  const { records } = table;
  const recKeys = Object.keys(records);
  const recKeyToPath = (key: string) => path.join(tablePath, records[key].name);
  const recPathPromises = recKeys
    .map(recKeyToPath)
    .map(fUtils.createDirRecursively);
  await Promise.all(recPathPromises);

  const filePromises = recKeys.reduce(
    (acc: Promise<void>[], recKey: string) => {
      return [
        ...acc,
        processFilesInManRec(recKeyToPath(recKey), records[recKey], forceWrite)
      ];
    },
    [] as Promise<void>[]
  );
  return Promise.all(filePromises);
};

const processTablesInManifest = async (
  tables: SN.TableMap,
  forceWrite: boolean
) => {
  const tableNames = Object.keys(tables);
  const tablePromises = tableNames.map(tableName => {
    return processRecsInManTable(
      path.join(ConfigManager.getSourcePath(), tableName),
      tables[tableName],
      forceWrite
    );
  });
  await Promise.all(tablePromises);
};

export const processManifest = async (
  manifest: SN.AppManifest,
  forceWrite = false
) => {
  await processTablesInManifest(manifest.tables, forceWrite);
  await fUtils.writeFileForce(
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
  const checkPromises = files.map(fUtils.SNFileExists(recPath));
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
  const recPaths = recNames.map(fUtils.appendToPath(tablePath));
  const checkPromises = recNames.map((recName, index) =>
    fUtils.pathExists(recPaths[index])
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
  const tablePaths = tableNames.map(fUtils.appendToPath(topPath));
  const checkPromises = tableNames.map((tableName, index) =>
    fUtils.pathExists(tablePaths[index])
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

export const processMissingFiles = async (newManifest: SN.AppManifest) => {
  try {
    const missing = await findMissingFiles(newManifest);
    const filesToProcess = await SNClient.getMissingFiles(missing);
    await processTablesInManifest(filesToProcess, false);
  } catch (e) {
    throw e;
  }
};

export const getAppFilesInPath = async (
  path: string
): Promise<Sinc.FileContext[]> => {
  const filePaths = await fUtils.getPathsInPath(path);
  const fileCtxPromises = filePaths.map(fUtils.getFileContextFromPath);
  const maybeFileContexts = await Promise.all(fileCtxPromises);
  const fileContexts = maybeFileContexts.filter(
    (ctx): ctx is Sinc.FileContext => ctx !== undefined
  );
  return fileContexts;
};

const getAppFilesInPaths = async (
  paths: string[]
): Promise<Sinc.FileContext[]> => {
  const appFilePromises = paths.map(getAppFilesInPath);
  const appFileLists = await Promise.all(appFilePromises);
  return appFileLists.flat();
};

type AppFileTree = Record<
  string,
  Record<string, Record<string, Sinc.FileContext>>
>;

export const groupAppFiles = (fileCtxs: Sinc.FileContext[]): AppFileTree => {
  const fillIfNotExists = (rec: Record<string, any>, key: string) => {
    if (!rec[key]) {
      rec[key] = {};
    }
  };
  return fileCtxs.reduce(
    (tree, cur) => {
      const { tableName, sys_id, targetField } = cur;
      fillIfNotExists(tree, tableName);
      fillIfNotExists(tree[tableName], sys_id);
      tree[tableName][sys_id][targetField] = cur;
      return tree;
    },
    {} as AppFileTree
  );
};
