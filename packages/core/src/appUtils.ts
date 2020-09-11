import { SN, Sinc } from "@sincronia/types";
import path from "path";
import ProgressBar from "progress";
import * as fUtils from "./FileUtils";
import * as SNClient from "./server";
import ConfigManager from "./config";
import { PATH_DELIMITER, PUSH_RETRY_LIMIT, PUSH_RETRY_WAIT } from "./constants";
import PluginManager from "./PluginManager";
import {
  defaultClient as clientFactory,
  processPushResponse,
  retryOnErr
} from "./snClient";
import { logger } from "./Logger";

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
): Promise<void> => {
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
  const fileCheckPromises = checks.map(async (check, index) => {
    const recName = recNames[index];
    const record = records[recName];
    if (!check) {
      markRecordMissing(record, missingFunc);
      return;
    }
    await checkFilesForMissing(
      recPaths[index],
      record.files,
      missingFunc(record.sys_id)
    );
  });
  await Promise.all(fileCheckPromises);
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

  const recCheckPromises = checks.map(async (check, index) => {
    const tableName = tableNames[index];
    if (!check) {
      markTableMissing(tables[tableName], tableName, missingFunc);
      return;
    }
    await checkRecordsForMissing(
      tablePaths[index],
      tables[tableName].records,
      missingFunc(tableName)
    );
  });
  await Promise.all(recCheckPromises);
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
  // missing gets mutated along the way as things get processed
  return missing;
};

export const processMissingFiles = async (
  newManifest: SN.AppManifest
): Promise<void> => {
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

const countRecsInTree = (tree: Sinc.AppFileContextTree): number => {
  return Object.keys(tree).reduce((acc, table) => {
    return acc + Object.keys(tree[table]).length;
  }, 0);
};

export const groupAppFiles = (
  fileCtxs: Sinc.FileContext[]
): Sinc.AppFileContextTree => {
  const fillIfNotExists = (rec: Record<string, unknown>, key: string) => {
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
    {} as Sinc.AppFileContextTree
  );
};

const buildRec = async (
  rec: Sinc.RecordContextMap
): Promise<Record<string, string>> => {
  const fields = Object.keys(rec);
  const buildPromises = fields.map(field => {
    return PluginManager.getFinalFileContents(rec[field]);
  });
  const builtFiles = await Promise.all(buildPromises);
  return builtFiles.reduce(
    (acc, content, index) => {
      const fieldName = fields[index];
      return { ...acc, [fieldName]: content };
    },
    {} as Record<string, string>
  );
};

const summarizeRecord = (table: string, sysId: string): string =>
  `${table}=>${sysId}`;

const buildAndPush = async (
  table: string,
  tableTree: Sinc.TableContextTree,
  tick?: () => void
): Promise<Sinc.PushResult[]> => {
  const recIds = Object.keys(tableTree);
  const buildPromises = recIds.map(sysId => buildRec(tableTree[sysId]));
  const builtRecs = await Promise.all(buildPromises);
  const client = clientFactory();
  const pushPromises = builtRecs.map(
    async (fieldMap, index): Promise<Sinc.PushResult> => {
      try {
        const res = await retryOnErr(
          () => client.updateRecord(table, recIds[index], fieldMap),
          PUSH_RETRY_LIMIT,
          PUSH_RETRY_WAIT
        );
        return processPushResponse(res, summarizeRecord(table, recIds[index]));
      } catch (e) {
        return { success: false, message: "Too many retries" };
      } finally {
        // this block always runs, even if we return
        if (tick) {
          tick();
        }
      }
    }
  );
  const pushResults = await Promise.all(pushPromises);
  return pushResults;
};

const getProgTick = (
  logLevel: string,
  total: number
): (() => void) | undefined => {
  if (logLevel === "info") {
    const progBar = new ProgressBar(":bar :current/:total (:percent)", {
      total,
      width: 60
    });
    return () => {
      progBar.tick();
    };
  }
  // no-op at other log levels
  return undefined;
};

export const getValidPaths = async (
  encodedPaths: string
): Promise<string[]> => {
  const pathChunks = encodedPaths
    .split(PATH_DELIMITER)
    .filter(p => p && p !== "");
  const pathExistsPromises = pathChunks.map(fUtils.pathExists);
  const pathExistsCheck = await Promise.all(pathExistsPromises);
  return pathChunks.filter((_, index) => pathExistsCheck[index]);
};

export const getFileTreeAndCount = async (
  encodedPaths: string
): Promise<[Sinc.AppFileContextTree, number]> => {
  const validPaths = await getValidPaths(encodedPaths);
  const appFileCtxs = await getAppFilesInPaths(validPaths);
  const appFileTree = groupAppFiles(appFileCtxs);
  const recordCount = countRecsInTree(appFileTree);
  return [appFileTree, recordCount];
};

export const pushFiles = async (
  appFileTree: Sinc.AppFileContextTree,
  recordCount: number
): Promise<Sinc.PushResult[]> => {
  const tick = getProgTick(logger.getLogLevel(), recordCount);
  const buildAndPushPromises = Object.keys(appFileTree).map(table =>
    buildAndPush(table, appFileTree[table], tick)
  );
  const tablePushResults = await Promise.all(buildAndPushPromises);
  return tablePushResults.flat();
};
