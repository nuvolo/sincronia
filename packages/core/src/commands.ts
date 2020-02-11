import { Sinc } from "@sincronia/types";
import { getSourcePath } from "./config";
import { startWatching } from "./Watcher";
import AppManager from "./AppManager";
import { startWizard } from "./wizard";
import { logger } from "./Logger";
import { scopeCheckMessage, devModeLog } from "./logMessages";

async function scopeCheck(successFunc: () => void) {
  try {
    const scopeCheck = await AppManager.checkScope();
    if (!scopeCheck.match) {
      scopeCheckMessage(scopeCheck);
    } else {
      successFunc();
    }
  } catch (e) {
    logger.error(
      "Failed to check your scope! You may want to make sure your project is configured correctly or run `npx sinc init`"
    );
  }
}

export async function devCommand() {
  scopeCheck(async () => {
    const _codeSrcPath = await getSourcePath();
    startWatching(_codeSrcPath);
    devModeLog();
  });
}
export async function refreshCommand() {
  scopeCheck(async () => {
    try {
      await AppManager.syncManifest();
    } catch (e) {
      throw e;
    }
  });
}
export async function pushCommand(args: Sinc.PushCmdArgs) {
  scopeCheck(async () => {
    try {
      if (args.target !== undefined) {
        if (args.target !== "") {
          await AppManager.pushSpecificFiles(args.target);
        }
      } else {
        await AppManager.pushAllFiles();
      }
    } catch (e) {
      throw e;
    }
  });
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
