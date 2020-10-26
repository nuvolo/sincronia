import { SN, Sinc } from "@sincronia/types";
import fs from "fs";
import * as cp from "child_process";
import path from "path";
import ConfigManager from "./config";
import * as Utils from "./genericUtils";
import { logger } from "./Logger";
import { logMultiFileBuild, logDeploy } from "./logMessages";
import inquirer from "inquirer";
import { getManifestWithFiles, getManifest, deployFiles } from "./server";
import PluginManager from "./PluginManager";
import * as AppUtils from "./appUtils";
import * as fUtils from "./FileUtils";
import ProgressBar from "progress";

const fsp = fs.promises;

class AppManager {
  constructor() {}

  /*
    MOVE TO: appUtils
    Split inquirer into download command
  */
  async downloadWithFiles(scope: string): Promise<any> {
    try {
      let answers: { confirmed: boolean } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message:
            "Downloading will overwrite manifest and files. Are you sure?",
          default: false
        }
      ]);
      if (!answers["confirmed"]) {
        return;
      }
      logger.info("Downloading manifest and files...");
      let man = await getManifestWithFiles(scope);
      logger.info("Creating local files from manifest...");
      await AppUtils.processManifest(man, true);
      logger.success("Download complete ✅");
    } catch (e) {
      logger.error("Encountered error while performing download ❌");
      logger.error(e.toString());
    }
  }

  /*
    MOVE TO: appUtils
  */
  async syncManifest() {
    try {
      let curManifest = await ConfigManager.getManifest();
      if (!curManifest) {
        throw new Error("No manifest file loaded!");
      }
      try {
        logger.info("Downloading fresh manifest...");
        let newManifest = await getManifest(curManifest.scope);
        logger.info("Writing new manifest file...");
        fUtils.writeManifestFile(newManifest);
        logger.info("Finding and creating missing files...");
        await AppUtils.processMissingFiles(newManifest);
        ConfigManager.updateManifest(newManifest);
        logger.success("Refresh complete! ✅");
      } catch (e) {
        logger.error("Encountered error while refreshing! ❌");
        logger.error(e.toString());
      }
    } catch (e) {
      logger.error("Encountered error while refreshing! ❌");
      logger.error(e.toString());
    }
  }

  /*
  MOVE TO: genericUtils
  Breyton: This might not be a necessary function anymore. In push, this is replaced by appUtils > getAppFilesInPaths I think
  */
  async parseFileParams(files: string[]) {
    return await Utils.getParsedFilesPayload(files);
  }

  /*
  MOVE TO: push command
  */
  async canPush() {
    const targetServer = process.env.SN_INSTANCE || "";
    if (!targetServer) {
      logger.error("No server configured for push!");
      return false;
    }
    try {
      let answers: { confirmed: boolean } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message:
            "Pushing will overwrite code in your instance. Are you sure?",
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
  Breyton: In addition to moving to appUtils, we should look at the build stuff I wrote for the new push flow and see how much we can re-use, may need to break out some of the push stuff into smaller functions to make it work.
  */
  async buildFile(
    filePayload: Sinc.FileContext,
    source: string,
    build: string
  ) {
    const { filePath, targetField } = filePayload;
    const fileContents = await PluginManager.getFinalFileContents(filePayload);

    /**
     * Breyton: May want to write a function for determining the extension. I believe there are other types of files that we can build to besides these three. XML for example.
     */
    let ext = "js";
    if (targetField === "css") ext = "css";
    if (targetField === "html") ext = "html";
    let pathArr = path
      .join(build, path.relative(source, filePath))
      .split(".")
      .slice(0, -1);
    pathArr.push(ext);

    const newPath = pathArr.join(".");
    const folderPath = path.dirname(newPath);
    try {
      await fsp.access(folderPath, fs.constants.F_OK);
    } catch (e) {
      await fsp.mkdir(folderPath, { recursive: true });
    }
    try {
      await fsp.writeFile(newPath, fileContents);
    } catch (e) {
      throw e;
    }
  }

  /*
    MOVE TO: appUtils
  */
  async buildFiles() {
    const resultSet: boolean[] = [];

    try {
      let source = ConfigManager.getSourcePath();
      let build = ConfigManager.getBuildPath();
      let paths = await fUtils.encodedPathsToFilePaths(source);
      logger.silly(`${paths.length} paths found...`);
      logger.silly(JSON.stringify(paths, null, 2));
      logger.info(`Building ${paths.length} files`);
      let fileContexts = await this.parseFileParams(paths);

      let progBar: ProgressBar | undefined;
      if (logger.getLogLevel() === "info") {
        progBar = new ProgressBar(":bar :current/:total (:percent)", {
          total: fileContexts.length,
          width: 60
        });
      }
      try {
        let resultsPromises = fileContexts.map(ctx => {
          const pushPromise = this.buildFile(ctx, source, build);
          pushPromise
            .then(() => {
              if (progBar) {
                progBar.tick();
              }
            })
            .catch(e => {
              if (progBar) {
                progBar.tick();
              }
              return false;
            });
          return true;
        });
        const results = await Promise.all(resultsPromises);
        resultSet.push(...results);
        logMultiFileBuild(fileContexts, true, resultSet);
      } catch (e) {
        logMultiFileBuild(fileContexts, false, [], e);
      }
    } catch (e) {
      throw e;
    }
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
