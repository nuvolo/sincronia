import { SN, Sinc } from "@sincronia/types";
import fs from "fs";
import * as cp from "child_process";
import path from "path";
import ConfigManager from "./config";
import * as Utils from "./genericUtils";
import { logger } from "./Logger";
import { logMultiFileBuild, logDeploy } from "./logMessages";
import inquirer from "inquirer";
import {
  getManifestWithFiles,
  getManifest,
  deployFiles,
  getCurrentScope,
  getScopeId,
  swapServerScope,
  createUpdateSet,
  getCurrentUpdateSetUserPref,
  getUserSysId,
  updateCurrentUpdateSetUserPref,
  createCurrentUpdateSetUserPref
} from "./server";
import { PATH_DELIMITER } from "./constants";
import PluginManager from "./PluginManager";
import * as AppUtils from "./appUtils";
import ProgressBar from "progress";

const fsp = fs.promises;

class AppManager {
  constructor() {}

  private async writeManifestFile(man: SN.AppManifest) {
    return fsp.writeFile(
      ConfigManager.getManifestPath(),
      JSON.stringify(man, null, 2)
    );
  }

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
        this.writeManifestFile(newManifest);
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

  private async getFilePaths(pathString: string) {
    let pathPromises = pathString
      .split(PATH_DELIMITER)
      .filter(cur => {
        //make sure it isn't blank
        if (cur && cur !== "") {
          //make sure it exists
          let resolvedPath = path.resolve(process.cwd(), cur);
          return fs.existsSync(resolvedPath);
        } else {
          return false;
        }
      })
      .map(async cur => {
        let resolvedPath = path.resolve(process.cwd(), cur);
        let stats = await fsp.stat(resolvedPath);
        if (stats.isDirectory()) {
          return await this.loadList(resolvedPath);
        } else {
          return [resolvedPath];
        }
      });
    let pathArrays = await Promise.all(pathPromises);
    let paths = pathArrays.reduce((acc, cur) => {
      return acc.concat(cur);
    }, []);
    logger.silly(`${paths.length} paths found...`);
    logger.silly(JSON.stringify(paths, null, 2));
    return paths;
  }

  private async loaddir(dirPath: string, list: string[]) {
    try {
      let files = await fsp.readdir(dirPath);
      for (let f of files) {
        let filep = path.join(dirPath, f);
        let stats = await fsp.stat(filep);
        if (stats.isDirectory()) {
          await this.loaddir(filep, list);
        } else {
          list.push(filep);
        }
      }
    } catch (e) {
      throw e;
    }
  }

  private async parseFileParams(files: string[]) {
    return await Utils.getParsedFilesPayload(files);
  }

  private async loadList(directory: string): Promise<string[]> {
    let list: string[] = [];
    await this.loaddir(directory, list);
    return list;
  }

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

  async buildFile(
    filePayload: Sinc.FileContext,
    source: string,
    build: string
  ) {
    const { filePath, targetField } = filePayload;
    const fileContents = await PluginManager.getFinalFileContents(filePayload);

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

  async buildFiles() {
    const resultSet: boolean[] = [];

    try {
      let source = ConfigManager.getSourcePath();
      let build = ConfigManager.getBuildPath();
      let paths = await this.getFilePaths(source);
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
        paths = await this.getFilePaths(build);
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

  async checkScope(swapScope: boolean): Promise<Sinc.ScopeCheckResult> {
    try {
      let man = ConfigManager.getManifest();
      if (man) {
        let scopeObj = await getCurrentScope();
        if (scopeObj.scope === man.scope) {
          return {
            match: true,
            sessionScope: scopeObj.scope,
            manifestScope: man.scope
          };
        } else if (swapScope) {
          const swappedScopeObj = await this.swapScope(man.scope);
          return {
            match: swappedScopeObj.scope === man.scope,
            sessionScope: swappedScopeObj.scope,
            manifestScope: man.scope
          };
        } else {
          return {
            match: false,
            sessionScope: scopeObj.scope,
            manifestScope: man.scope
          };
        }
      }
      //first time case
      return {
        match: true,
        sessionScope: "",
        manifestScope: ""
      };
    } catch (e) {
      throw e;
    }
  }

  private async swapScope(currentScope: string): Promise<SN.ScopeObj> {
    try {
      const scopeId = await getScopeId(currentScope);
      await swapServerScope(scopeId);
      const scopeObj = await getCurrentScope();
      return scopeObj;
    } catch (e) {
      throw e;
    }
  }

  gitDiff(target: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const cmdStr = `git diff --name-status ${target}...`;
      cp.exec(cmdStr, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.formatGitFiles(stdout.trim()));
        }
      });
    });
  }

  async writeDiff(files: string) {
    let paths = await this.getFilePaths(files);
    fsp.writeFile(
      ConfigManager.getDiffPath(),
      JSON.stringify({ changed: paths })
    );
  }

  private async formatGitFiles(gitFiles: string) {
    const baseRepoPath = await this.getRepoRootDir();
    const workspaceDir = process.cwd();
    const fileSplit = gitFiles.split(/\r?\n/);
    const fileArray: string[] = [];
    fileSplit.forEach(diffFile => {
      if (diffFile !== "") {
        const modCode = diffFile.charAt(0);

        if (modCode !== "D") {
          const filePath = diffFile.substr(1, diffFile.length - 1).trim();

          if (this.isValidScope(filePath, workspaceDir, baseRepoPath)) {
            logger.info(diffFile);
            const absFilePath = path.resolve(baseRepoPath, filePath);
            fileArray.push(absFilePath);
          }
        }
      }
    });
    return fileArray.join(PATH_DELIMITER);
  }

  private getRepoRootDir(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      cp.exec("git rev-parse --show-toplevel", (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  private isValidScope(
    file: string,
    scope: string,
    baseRepoPath: string
  ): boolean {
    const relativePath = path.relative(baseRepoPath, scope);
    return file.startsWith(relativePath) ? true : false;
  }

  /**
   * Creates a new update set and assigns it to the current user.
   * @param updateSetName - does not create update set if value is blank
   * @param skipPrompt - will not prompt user to verify update set name
   *
   */
  async createAndAssignUpdateSet(
    updateSetName: string = "",
    skipPrompt: boolean = false
  ): Promise<void> {
    if (updateSetName !== "") {
      if (await this.promptForNewUpdateSet(updateSetName, skipPrompt)) {
        const updateSetSysId = await createUpdateSet(updateSetName);

        logger.debug(
          `New Update Set Created(${updateSetName}) sys_id:${updateSetSysId}`
        );

        const userSysId = await getUserSysId();

        const curUpdateSetUserPrefId = await getCurrentUpdateSetUserPref(
          userSysId
        );

        if (curUpdateSetUserPrefId !== "") {
          await updateCurrentUpdateSetUserPref(
            updateSetSysId,
            curUpdateSetUserPrefId
          );
        } else {
          await createCurrentUpdateSetUserPref(updateSetSysId, userSysId);
        }
      } else {
        process.exit(0);
      }
    }
  }

  private async promptForNewUpdateSet(
    updateSetName: string,
    skipPrompt: boolean = false
  ): Promise<boolean> {
    try {
      if (skipPrompt) return true;
      let answers: { confirmed: boolean } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message: `A new Update Set "${updateSetName}" will be created for these pushed changes. Do you want to proceed?`,
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
}

export default new AppManager();
