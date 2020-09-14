import chokidar from "chokidar";
import { logFilePush } from "./logMessages";
import { debounce } from "lodash";
import { getFileContextFromPath } from "./FileUtils";
import { Sinc } from "@sincronia/types";
import { defaultClient as client, processPushResponse } from "./snClient";
import { buildRec, summarizeRecord } from "./appUtils";
const DEBOUNCE_MS = 300;
let pushQueue: string[] = [];
let watcher: chokidar.FSWatcher | undefined = undefined;

const processQueue = debounce(async () => {
  const snClient = client();
  if (pushQueue.length > 0) {
    //dedupe pushes
    const toProcess = Array.from(new Set([...pushQueue]));
    pushQueue = [];
    const fileContexts = toProcess
      .map(getFileContextFromPath)
      .filter((ctx): ctx is Sinc.FileContext => !!ctx);
    const buildPromises = fileContexts.map(ctx => {
      const { targetField } = ctx;
      const fieldMap = { [targetField]: ctx };
      return buildRec(fieldMap);
    });
    const builds = await Promise.all(buildPromises);
    const updatePromises = builds.map(async (recMap, index) => {
      const { tableName, sys_id } = fileContexts[index];
      try {
        const response = await snClient.updateRecord(tableName, sys_id, recMap);
        return processPushResponse(
          response,
          summarizeRecord(tableName, sys_id)
        );
      } catch (e) {
        return { success: false, message: e.message || "Failed to update" };
      }
    });

    const updateResults = await Promise.all(updatePromises);
    updateResults.forEach((res, index) => {
      logFilePush(fileContexts[index], res);
    });
  }
}, DEBOUNCE_MS);

export function startWatching(directory: string) {
  watcher = chokidar.watch(directory);
  watcher.on("change", fileChanged);
}

async function fileChanged(path: string) {
  pushQueue.push(path);
  processQueue();
}

export function stopWatching() {
  if (watcher) {
    watcher.close();
  }
}
