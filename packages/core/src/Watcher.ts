import chokidar from "chokidar";
import { logFilePush } from "./logMessages";
import { debounce } from "lodash";
import { getFileContextFromPath } from "./FileUtils";
import { Sinc } from "@sincronia/types";
import { defaultClient as client, processPushResponse } from "./snClient";
import { buildRec, summarizeRecord } from "./appUtils";
import { allSettled } from "./genericUtils";
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
    const builds = await allSettled(buildPromises);
    const updatePromises = builds.map(
      async (buildRes, index): Promise<Sinc.PushResult> => {
        const { tableName, sys_id, name } = fileContexts[index];
        if (buildRes.status === "rejected") {
          return {
            success: false,
            message: buildRes.reason.message || "Failed to build"
          };
        }
        try {
          const response = await snClient.updateRecord(
            tableName,
            sys_id,
            buildRes.value
          );
          return processPushResponse(
            response,
            summarizeRecord(tableName, name)
          );
        } catch (e) {
          return { success: false, message: e.message || "Failed to update" };
        }
      }
    );

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
