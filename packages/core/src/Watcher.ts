import chokidar from "chokidar";
import * as Utils from "./utils";
import { pushFile } from "./server";
import * as logger from "./logging";
class Watcher {
  watcher?: chokidar.FSWatcher;
  constructor() {
    this.watcher = undefined;
  }
  startWatching(directory: string) {
    this.watcher = chokidar.watch(directory);
    this.watcher.on("change", this.fileChanged);
  }
  private async fileChanged(path: string) {
    try {
      let payload = await Utils.parseFileNameParams(path);
      const targetServer =
        process.env.SN_INSTANCE ||
        logger.error("No server configured for push!") ||
        "";
      if (targetServer && payload) {
        try {
          await pushFile(targetServer, payload);
          logger.logFilePush(payload, true);
        } catch (e) {
          logger.logFilePush(payload, false);
          logger.error(e);
        }
      }
    } catch (e) {
      throw e;
    }
  }
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
export default new Watcher();
