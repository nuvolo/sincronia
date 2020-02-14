import { Sinc } from "@sincronia/types";
import { getSourcePath } from "./config";
import { startWatching } from "./Watcher";
import AppManager from "./AppManager";
import { startWizard } from "./wizard";
import { logger } from "./Logger";
import { scopeCheckMessage, devModeLog } from "./logMessages";

async function scopeCheck(swapScopes: boolean, successFunc: () => void) {
  try {
    const scopeCheck = await AppManager.checkScope(swapScopes);
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

function setLogLevel(args: Sinc.SharedCmdArgs) {
  logger.setLogLevel(args.logLevel);
}

export async function devCommand() {
  scopeCheck(false, async () => {
    const _codeSrcPath = await getSourcePath();
    startWatching(_codeSrcPath);
    devModeLog();
  });
}
export async function refreshCommand() {
  scopeCheck(false, async () => {
    try {
      await AppManager.syncManifest();
    } catch (e) {
      throw e;
    }
  });
}
export async function pushCommand(args: Sinc.PushCmdArgs) {
  scopeCheck(args.scopeSwap, async () => {
    try {
      if (args.target !== undefined) {
        if (args.target !== "") {
          await AppManager.pushSpecificFiles(args.ci, args.target);
        }
      } else if (args.diff !== "") {
        const files = await AppManager.gitDiff(args.diff);
        await AppManager.pushSpecificFiles(args.ci, files);
      } else {
        await AppManager.pushAllFiles(args.ci);
      }
    } catch (e) {
      throw e;
    }
  });
}
export async function downloadCommand(args: Sinc.CmdDownloadArgs) {
  setLogLevel(args);
  try {
    await AppManager.downloadWithFiles(args.scope as string);
  } catch (e) {
    throw e;
  }
}
export async function initCommand(args: Sinc.SharedCmdArgs) {
  setLogLevel(args);
  try {
    await startWizard();
  } catch (e) {
    throw e;
  }
}
