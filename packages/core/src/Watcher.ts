import chokidar from "chokidar";
import * as Utils from "./utils";
import { pushFile } from "./server";
import { logger } from "./Logger";
import { logFilePush } from "./logMessages";
import { debounce } from "lodash";
const DEBOUNCE_MS = 300;
let pushQueue: string[] = [];
let watcher: chokidar.FSWatcher | undefined = undefined;

const processQueue = debounce(() => {
  if (pushQueue.length > 0) {
    //dedupe pushes
    let toProcess = new Set(pushQueue.slice());
    pushQueue = [];
    toProcess.forEach(path => {
      let payloadPromise = Utils.parseFileNameParams(path);
      payloadPromise
        .then(payload => {
          const targetServer =
            process.env.SN_INSTANCE ||
            logger.error("No server configured for push!") ||
            "";
          if (targetServer && payload) {
            pushFile(targetServer, payload, true, true)
              .then(result => {
                logFilePush(payload, result);
              })
              .catch(() => {
                logFilePush(payload, false);
              });
          }
        })
        .catch(e => {
          throw e;
        });
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
