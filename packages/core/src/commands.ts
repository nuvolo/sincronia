import { Sinc } from "@sincronia/types";
import ConfigManager from "./config";
import { startWatching } from "./Watcher";
import AppManager from "./AppManager";
import * as AppUtils from "./appUtils";
import { startWizard } from "./wizard";
import { logger } from "./Logger";
import {
  scopeCheckMessage,
  devModeLog,
  logPushResults,
  logBuildResults
} from "./logMessages";
import { defaultClient, unwrapSNResponse } from "./snClient";
import inquirer from "inquirer";
import { gitDiffToEncodedPaths } from "./gitUtils";

async function scopeCheck(
  successFunc: () => void,
  swapScopes: boolean = false
) {
  try {
    const scopeCheck = await AppUtils.checkScope(swapScopes);
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
    process.exit(1);
  }
}

function setLogLevel(args: Sinc.SharedCmdArgs) {
  logger.setLogLevel(args.logLevel);
}

export async function devCommand(args: Sinc.SharedCmdArgs) {
  setLogLevel(args);
  scopeCheck(async () => {
    startWatching(ConfigManager.getSourcePath());
    devModeLog();

    let refresher = () => {
      refreshCommand(args, false);
    };
    let interval = ConfigManager.getRefresh();
    if (interval && interval > 0) {
      logger.info(`Checking for new manifest files every ${interval} seconds`);
      setInterval(refresher, interval * 1000);
    }
  });
}
export async function refreshCommand(
  args: Sinc.SharedCmdArgs,
  log: boolean = true
) {
  setLogLevel(args);
  scopeCheck(async () => {
    try {
      if (!log) setLogLevel({ logLevel: "warn" });
      await AppUtils.syncManifest();
      logger.success("Refresh complete! ✅");
      setLogLevel(args);
    } catch (e) {
      throw e;
    }
  });
}
export async function pushCommand(args: Sinc.PushCmdArgs): Promise<void> {
  setLogLevel(args);
  scopeCheck(async () => {
    try {
      const { updateSet, ci: skipPrompt, target, diff } = args;
      let encodedPaths;
      if (target !== undefined && target !== "") encodedPaths = target;
      else encodedPaths = await gitDiffToEncodedPaths(diff);

      const [fileTree, count] = await AppUtils.getFileTreeAndCount(
        encodedPaths
      );
      logger.info(`${count} files to push.`);

      if (!skipPrompt) {
        const targetServer = process.env.SN_INSTANCE;
        if (!targetServer) {
          logger.error("No server configured for push!");
          return;
        }
        let answers: { confirmed: boolean } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message:
              "Pushing will overwrite code in your instance. Are you sure?",
            default: false
          }
        ]);
        if (!answers["confirmed"]) return;
      }

      // Does not create update set if updateSetName is blank
      if (updateSet) {
        if (!skipPrompt) {
          let answers: { confirmed: boolean } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirmed",
              message: `A new Update Set "${updateSet}" will be created for these pushed changes. Do you want to proceed?`,
              default: false
            }
          ]);
          if (!answers["confirmed"]) {
            process.exit(0);
          }
        }

        let newUpdateSet = await AppUtils.createAndAssignUpdateSet(updateSet);
        logger.debug(
          `New Update Set Created(${newUpdateSet.name}) sys_id:${newUpdateSet.id}`
        );
      }
      const pushResults = await AppUtils.pushFiles(fileTree, count);
      logPushResults(pushResults);
    } catch (e) {
      process.exit(1);
    }
  }, args.scopeSwap);
}
export async function downloadCommand(args: Sinc.CmdDownloadArgs) {
  setLogLevel(args);
  try {
    let answers: { confirmed: boolean } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: "Downloading will overwrite manifest and files. Are you sure?",
        default: false
      }
    ]);
    if (!answers["confirmed"]) {
      return;
    }
    logger.info("Downloading manifest and files...");
    const client = defaultClient();
    const config = ConfigManager.getConfig();
    const man = await unwrapSNResponse(
      client.getManifest(args.scope, config, true)
    );
    logger.info("Creating local files from manifest...");
    await AppUtils.processManifest(man, true);
    logger.success("Download complete ✅");
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

export async function buildCommand(args: Sinc.BuildCmdArgs) {
  setLogLevel(args);
  try {
    const encodedPaths = await gitDiffToEncodedPaths(args.diff);
    const [fileTree, count] = await AppUtils.getFileTreeAndCount(encodedPaths);
    logger.info(`${count} files to push.`);
    let results = await AppUtils.buildFiles(fileTree, count);
    logBuildResults(results);
  } catch (e) {
    process.exit(1);
  }
}

export async function deployCommand(args: Sinc.SharedCmdArgs) {
  setLogLevel(args);
  try {
    await AppManager.deployFiles();
  } catch (e) {
    throw e;
  }
}

export async function statusCommand() {
  try {
    const client = defaultClient();
    let scopeObj = await unwrapSNResponse(client.getCurrentScope());
    logger.info(`Instance: ${process.env.SN_INSTANCE}`);
    logger.info(`Scope: ${scopeObj.scope}`);
    logger.info(`User: ${process.env.SN_USER}`);
  } catch (e) {
    throw e;
  }
}
