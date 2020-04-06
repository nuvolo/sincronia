import { Sinc } from "@sincronia/types";
import { getSourcePath } from "./config";
import { startWatching } from "./Watcher";
import AppManager from "./AppManager";
import { startWizard } from "./wizard";
import { logger } from "./Logger";
import { scopeCheckMessage, devModeLog } from "./logMessages";

async function scopeCheck(
  successFunc: () => void,
  swapScopes: boolean = false
) {
  try {
    const scopeCheck = await AppManager.checkScope(swapScopes);
    if (!scopeCheck.match) {
      scopeCheckMessage(scopeCheck);
      // Throw exception to register this as an error
      throw new Error();
    } else {
      successFunc();
    }
  } catch (e) {
    logger.error(
      "Failed to check your scope! You may want to make sure your project is configured correctly or run `npx sinc init`"
    );
    // Throw exception to register this as an error
    throw e;
  }
}

function setLogLevel(args: Sinc.SharedCmdArgs) {
  logger.setLogLevel(args.logLevel);
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
  setLogLevel(args);
  scopeCheck(async () => {
    try {
      // Does not create update set if updateSetName is blank
      await AppManager.createAndAssignUpdateSet(args.updateSet, args.ci);

      if (args.target !== undefined) {
        if (args.target !== "") {
          await AppManager.pushSpecificFiles(args.target, args.ci);
        }
      } else if (args.diff !== "") {
        const files = await AppManager.gitDiff(args.diff);
        await AppManager.pushSpecificFiles(files, args.ci);
      } else {
        await AppManager.pushAllFiles(args.ci);
      }
    } catch (e) {
      throw e;
    }
  }, args.scopeSwap);
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
