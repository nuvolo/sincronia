import { SN, Sinc } from "@sincronia/types";
import path from "path";
import ProgressBar from "progress";
import * as fUtils from "./FileUtils";
import ConfigManager from "./config";
import { PUSH_RETRY_LIMIT, PUSH_RETRY_WAIT } from "./constants";
import PluginManager from "./PluginManager";
import {
  defaultClient as clientFactory,
  processPushResponse,
  retryOnErr,
  unwrapSNResponse,
  unwrapTableAPIFirstItem
} from "./snClient";
import { logger } from "./Logger";
import { aggregateErrorMessages, allSettled } from "./genericUtils";

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
    const { tableOptions = {} } = ConfigManager.getConfig();
    const client = clientFactory();
    const filesToProcess = await unwrapSNResponse(
      client.getMissingFiles(missing, tableOptions)
    );
    await processTablesInManifest(filesToProcess, false);
  } catch (e) {
    throw e;
  }
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

export const buildRec = async (
  rec: Sinc.RecordContextMap
): Promise<Record<string, string>> => {
  const fields = Object.keys(rec);
  const buildPromises = fields.map(field => {
    return PluginManager.getFinalFileContents(rec[field]);
  });
  const builtFiles = await allSettled(buildPromises);
  const buildSuccess = !builtFiles.find(
    buildRes => buildRes.status === "rejected"
  );
  if (!buildSuccess) {
    throw new Error(
      aggregateErrorMessages(
        builtFiles
          .filter((b): b is Sinc.FailPromiseResult => b.status === "rejected")
          .map(b => b.reason),
        "Failed to build!",
        (_, index) => `${index}`
      )
    );
  }
  return builtFiles.reduce(
    (acc, buildRes, index) => {
      const { value: content } = buildRes as Sinc.SuccessPromiseResult<string>;
      const fieldName = fields[index];
      return { ...acc, [fieldName]: content };
    },
    {} as Record<string, string>
  );
};

export const summarizeRecord = (table: string, recDescriptor: string): string =>
  `${table} > ${recDescriptor}`;

const buildRecords = async (
  table: string,
  tableTree: Sinc.TableContextTree
): Promise<Sinc.BuildRecord[]> => {
  const recIds = Object.keys(tableTree);
  const buildPromises = recIds.map(sysId => buildRec(tableTree[sysId]));
  const builtRecs = await allSettled(buildPromises);
  return builtRecs.map((buildRes, index) => {
    const recMap = tableTree[recIds[index]];
    const recFields = Object.keys(recMap);
    const recDesc = recMap[recFields[0]].name || recIds[index];
    const recSummary = summarizeRecord(table, recDesc);
    const context = recMap[recFields[0]];
    return { result: buildRes, summary: recSummary, context: context };
  });
};

const buildAndPush = async (
  table: string,
  tableTree: Sinc.TableContextTree,
  tick?: () => void
): Promise<Sinc.PushResult[]> => {
  const builtRecs = await buildRecords(table, tableTree);
  const client = clientFactory();
  const pushPromises = builtRecs.map(
    async (record): Promise<Sinc.PushResult> => {
      const buildRes = record.result;
      if (buildRes.status === "rejected") {
        return {
          success: false,
          message: `${record.summary} : ${buildRes.reason.message}`
        };
      }
      try {
        const res = await retryOnErr(
          () =>
            client.updateRecord(table, record.context.sys_id, buildRes.value),
          PUSH_RETRY_LIMIT,
          PUSH_RETRY_WAIT,
          (numTries: number) => {
            logger.debug(
              `Failed to push ${record.summary}! Retrying with ${numTries} left...`
            );
          }
        );
        return processPushResponse(res, record.summary);
      } catch (e) {
        const errMsg = e.message || "Too many retries";
        return { success: false, message: `${record.summary} : ${errMsg}` };
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

export const getFileTreeAndCount = async (
  encodedPaths: string
): Promise<[Sinc.AppFileContextTree, number]> => {
  const validPaths = await fUtils.encodedPathsToFilePaths(encodedPaths);
  const appFileCtxs = validPaths
    .map(fUtils.getFileContextFromPath)
    .filter((maybeCtx): maybeCtx is Sinc.FileContext => !!maybeCtx);
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

const buildAndWrite = async (
  table: string,
  tableTree: Sinc.TableContextTree,
  sourcePath: string,
  buildPath: string,
  tick?: () => void
) => {
  const builtRecs = await buildRecords(table, tableTree);
  const writePromises = builtRecs.map(
    async (record): Promise<Sinc.BuildResult> => {
      const buildRes = record.result;
      if (buildRes.status === "rejected") {
        return {
          success: false,
          message: `${record.summary} : ${buildRes.reason.message}`
        };
      }

      try {
        const filePath = record.context.filePath;
        let pathArr = path
          .join(buildPath, path.relative(sourcePath, filePath))
          .split(".")
          .slice(0, -1);

        const basePath = pathArr.join(".");
        const folderPath = path.dirname(basePath);
        const exts = fUtils.getBuildExtensions(record.context);

        const fileWritePromsies = Object.keys(buildRes.value).map(file => {
          const newPath = path.join(folderPath, file + "." + exts[file]);
          const fileContents = buildRes.value[file];
          return fUtils.writeBuildFile(folderPath, newPath, fileContents);
        });

        const results = await allSettled(fileWritePromsies);
        results.forEach(res => {
          if (res.status == "rejected") {
            return {
              success: false,
              message: `${record.summary} : ${res.reason}`
            };
          }
        });

        return {
          success: true,
          message: `${record.summary} built successfully`
        };
      } catch (e) {
        const errMsg = e.message;
        return { success: false, message: `${record.summary} : ${errMsg}` };
      } finally {
        if (tick) tick();
      }
    }
  );
  const buildResults = await Promise.all(writePromises);
  return buildResults;
};

export const buildFiles = async (
  fileTree: Sinc.AppFileContextTree,
  count: number
): Promise<Sinc.BuildResult[]> => {
  const source = ConfigManager.getSourcePath();
  const build = ConfigManager.getBuildPath();
  const tick = getProgTick(logger.getLogLevel(), count);
  const buildPromises = Object.keys(fileTree).map(table =>
    buildAndWrite(table, fileTree[table], source, build, tick)
  );
  const results = await Promise.all(buildPromises);
  return results.flat();
};

export const swapScope = async (currentScope: string): Promise<SN.ScopeObj> => {
  try {
    const client = clientFactory();
    const scopeId = await unwrapTableAPIFirstItem(
      client.getScopeId(currentScope),
      "sys_id"
    );
    await swapServerScope(scopeId);
    const scopeObj = await unwrapSNResponse(client.getCurrentScope());
    return scopeObj;
  } catch (e) {
    throw e;
  }
};

const swapServerScope = async (scopeId: string): Promise<void> => {
  try {
    const client = clientFactory();
    const userSysId = await unwrapTableAPIFirstItem(
      client.getUserSysId(),
      "sys_id"
    );
    const curAppUserPrefId =
      (await unwrapTableAPIFirstItem(
        client.getCurrentAppUserPrefSysId(userSysId),
        "sys_id"
      )) || "";
    // If not user pref record exists, create it.
    if (curAppUserPrefId !== "")
      await client.updateCurrentAppUserPref(scopeId, curAppUserPrefId);
    else await client.createCurrentAppUserPref(scopeId, userSysId);
  } catch (e) {
    logger.error(e);
    throw e;
  }
};

/**
 * Creates a new update set and assigns it to the current user.
 * @param updateSetName - does not create update set if value is blank
 */
export const createAndAssignUpdateSet = async (updateSetName = "") => {
  logger.info(`Update Set Name: ${updateSetName}`);
  const client = clientFactory();
  const { sys_id: updateSetSysId } = await unwrapSNResponse(
    client.createUpdateSet(updateSetName)
  );
  const userSysId = await unwrapTableAPIFirstItem(
    client.getUserSysId(),
    "sys_id"
  );
  const curUpdateSetUserPrefId = await unwrapTableAPIFirstItem(
    client.getCurrentUpdateSetUserPref(userSysId),
    "sys_id"
  );

  if (curUpdateSetUserPrefId !== "") {
    await client.updateCurrentUpdateSetUserPref(
      updateSetSysId,
      curUpdateSetUserPrefId
    );
  } else {
    await client.createCurrentUpdateSetUserPref(updateSetSysId, userSysId);
  }
  return {
    name: updateSetName,
    id: updateSetSysId
  };
};

export const checkScope = async (
  swap: boolean
): Promise<Sinc.ScopeCheckResult> => {
  try {
    const man = ConfigManager.getManifest();
    if (man) {
      const client = clientFactory();
      const scopeObj = await unwrapSNResponse(client.getCurrentScope());
      if (scopeObj.scope === man.scope) {
        return {
          match: true,
          sessionScope: scopeObj.scope,
          manifestScope: man.scope
        };
      } else if (swap) {
        const swappedScopeObj = await swapScope(man.scope);
        return {
          match: swappedScopeObj.scope === man.scope,
          sessionScope: swappedScopeObj.scope,
          manifestScope: man.scope
        };
      } else {
        return {
          match: false,
          sessionScope: scopeObj.scope,
          manifestScope: man.scope
        };
      }
    }
    //first time case
    return {
      match: true,
      sessionScope: "",
      manifestScope: ""
    };
  } catch (e) {
    throw e;
  }
};
