import { Sinc } from "@sincronia/types";
import { getSourcePath } from "./config";
import Watcher from "./Watcher";
import AppManager from "./AppManager";
import { startWizard } from "./wizard";
import * as logger from "./logging";

export async function devCommand() {
  const _codeSrcPath = await getSourcePath();
  Watcher.startWatching(_codeSrcPath);
  logger.devModeLog();
}
export async function refreshCommand() {
  try {
    await AppManager.syncManifest();
  } catch (e) {
    throw e;
  }
}
export async function pushCommand(args: Sinc.PushCmdArgs) {
  try {
    if (args.target) {
      await AppManager.pushSpecificFiles(args.target);
    } else {
      await AppManager.pushAllFiles();
    }
  } catch (e) {
    throw e;
  }
}
export async function downloadCommand(args: Sinc.CmdDownloadArgs) {
  try {
    await AppManager.downloadWithFiles(args.scope as string);
  } catch (e) {
    throw e;
  }
}
export async function initCommand() {
  try {
    await startWizard();
  } catch (e) {
    throw e;
  }
}
