import chokidar from "chokidar";
import * as Utils from "./utils";
import { pushFile } from "./server";
import * as logger from "./logging";
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
            pushFile(targetServer, payload)
              .then(() => {
                logger.logFilePush(payload, true);
              })
              .catch(() => {
                logger.logFilePush(payload, false);
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
  // try {
  //   let payload = await Utils.parseFileNameParams(path);
  //   const targetServer =
  //     process.env.SN_INSTANCE ||
  //     logger.error("No server configured for push!") ||
  //     "";
  //   if (targetServer && payload) {
  //     try {
  //       await pushFile(targetServer, payload);
  //       logger.logFilePush(payload, true);
  //     } catch (e) {
  //       logger.logFilePush(payload, false);
  //       logger.error(e);
  //     }
  //   }
  // } catch (e) {
  //   throw e;
  // }
}

export function stopWatching() {
  if (watcher) {
    watcher.close();
  }
}
