import fs from "fs";
import ConfigManager from "./config";
import * as Utils from "./genericUtils";
import { logger } from "./Logger";
import { logDeploy } from "./logMessages";
import inquirer from "inquirer";
import { deployFiles } from "./server";
import * as fUtils from "./FileUtils";

const fsp = fs.promises;

class AppManager {
  constructor() {}

  /*
  MOVE TO: genericUtils
  Breyton: This might not be a necessary function anymore. In push, this is replaced by appUtils > getAppFilesInPaths I think
  */
  async parseFileParams(files: string[]) {
    return await Utils.getParsedFilesPayload(files);
  }

  /*
    MOVE TO: deploy command
  */
  async canDeploy() {
    const targetServer = process.env.SN_INSTANCE || "";
    if (!targetServer) {
      logger.error("No server configured for deploy!");
      return false;
    }
    try {
      let answers: { confirmed: boolean } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message:
            "Deploying will overwrite code in your instance. Are you sure?",
          default: false
        }
      ]);
      if (!answers["confirmed"]) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /*
    MOVE TO: appUtils
    TRY TO: split inquirer into deploy command
    Breyton: Similar to the build command, there's probably some logic from the new push that we can re-use here to push the files up. 
  */
  async deployFiles(skipPrompt: boolean = false) {
    try {
      let paths = ConfigManager.getDiffFile().changed;
      let deployDiff = false;
      if (paths && paths.length > 0) {
        let answers: { confirmed: boolean } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message:
              "Would you like to deploy only files changed in your diff file?",
            default: false
          }
        ]);
        if (answers["confirmed"]) deployDiff = true;
      }
      if (!deployDiff) {
        const build = ConfigManager.getBuildPath();
        paths = await fUtils.encodedPathsToFilePaths(build);
        logger.silly(`${paths.length} paths found...`);
        logger.silly(JSON.stringify(paths, null, 2));
      }
      let fileContexts = await this.parseFileParams(paths);
      logger.info(`${fileContexts.length} files to deploy...`);
      logger.silly(
        JSON.stringify(fileContexts.map(ctx => ctx.filePath), null, 2)
      );
      if (skipPrompt || (await this.canDeploy())) {
        try {
          const resultSet = await deployFiles(
            process.env.SN_INSTANCE || "",
            fileContexts
          );
          logDeploy(fileContexts, true, resultSet);
        } catch (e) {
          logDeploy(fileContexts, false, [], e);
        }
      }
    } catch (e) {
      throw e;
    }
  }
}

export default new AppManager();
