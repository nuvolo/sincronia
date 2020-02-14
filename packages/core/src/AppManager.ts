import { SN, Sinc } from "@sincronia/types";
import fs from "fs";
import * as cp from "child_process";
import path from "path";
import { config, manifest, getManifestPath, getSourcePath } from "./config";
import * as Utils from "./utils";
import { logger } from "./Logger";
import { logMultiFilePush } from "./logMessages";
import inquirer from "inquirer";
import {
  getManifestWithFiles,
  getManifest,
  getMissingFiles,
  pushFiles,
  getCurrentScope,
  getScopeId,
  swapServerScope
} from "./server";

const fsp = fs.promises;

class AppManager {
  constructor() {}

  private async writeManifestFile(man: SN.AppManifest) {
    return fsp.writeFile(await getManifestPath(), JSON.stringify(man, null, 2));
  }

  private async writeNewFiles(
    file: SN.File,
    parentDir: string,
    content: string,
    skipFileCheck: boolean
  ) {
    let exists = true;
    if (!skipFileCheck) {
      let files = await fsp.readdir(parentDir);
      let matchingFiles = files.filter(f => {
        let reg = new RegExp(file.name + "\\.*$");
        return reg.test(f);
      });
      exists = matchingFiles.length > 0;
    }

    if (skipFileCheck || !exists) {
      await fsp.writeFile(
        path.join(parentDir, `${file.name}.${file.type}`),
        content
      );
    }
  }

  private async createNewFiles(
    manifest: SN.AppManifest,
    skipFileCheck: boolean
  ) {
    const { tables } = manifest;
    const _codeSrcPath = await getSourcePath();
    for (let tableName in tables) {
      let table = tables[tableName];
      let tableFolder = path.join(_codeSrcPath, tableName);
      for (let recKey in table.records) {
        const rec = table.records[recKey];
        let recPath = path.join(tableFolder, rec.name);
        await fsp.mkdir(recPath, { recursive: true });
        for (let file of rec.files) {
          const content = file.content || "";
          await this.writeNewFiles(file, recPath, content, skipFileCheck);
          delete file.content;
        }
      }
    }
  }

  async processManifest(
    manifest: SN.AppManifest,
    skipFileCheckOnFileGeneration?: boolean
  ) {
    if (
      !skipFileCheckOnFileGeneration &&
      typeof skipFileCheckOnFileGeneration !== "boolean"
    ) {
      skipFileCheckOnFileGeneration = false;
    }
    const skipFileCheck = skipFileCheckOnFileGeneration;
    await this.createNewFiles(manifest, skipFileCheck);
    await this.writeManifestFile(manifest);
  }

  async downloadWithFiles(
    scope: string,
    skipFileCheck?: boolean
  ): Promise<any> {
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
      await this.processManifest(man, skipFileCheck);
      logger.success("Download complete ✅");
    } catch (e) {
      logger.error("Encountered error while performing download ❌");
      logger.error(e.toString());
    }
  }
  async syncManifest() {
    try {
      let curManifest = await manifest;
      if (!curManifest) {
        throw new Error("No manifest file loaded!");
      }
      try {
        logger.info("Downloading fresh manifest...");
        let newManifest = await getManifest(curManifest.scope);
        logger.info("Writing new manifest file...");
        this.writeManifestFile(newManifest);
        logger.info("Finding and creating missing files...");
        await this.reconcileDifferences(newManifest);
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

  private async reconcileDifferences(manifest: SN.AppManifest) {
    try {
      let missing = await this.determineMissing(manifest);
      let missingFileMap = await getMissingFiles(missing);
      await this.loadMissingFiles(missingFileMap);
    } catch (e) {
      throw e;
    }
  }

  private async determineMissing(
    manifest: SN.AppManifest
  ): Promise<SN.MissingFileTableMap> {
    try {
      let missing: SN.MissingFileTableMap = {};
      const _codeSrcPath = await getSourcePath();
      const { tables } = manifest;
      //go through each table
      for (let tableName in tables) {
        let table = tables[tableName];
        let tablePath = path.join(_codeSrcPath, tableName);
        try {
          await fsp.access(tablePath, fs.constants.F_OK);
        } catch (e) {
          this.noteMissingTable(missing, table, tableName);
          continue;
        }
        //go through records
        for (let recName in table.records) {
          let record = table.records[recName];
          let recPath = path.join(tablePath, recName);
          try {
            await fsp.access(recPath, fs.constants.F_OK);
          } catch (e) {
            this.noteMissingRecord(missing, record, tableName);
            continue;
          }
          //go through files
          for (let file of record.files) {
            let fileList = await fsp.readdir(recPath);
            let matchingFiles = fileList.filter(f => {
              let reg = new RegExp(file.name + ".*$");
              return reg.test(f);
            });
            let exists = matchingFiles.length > 0;
            if (!exists) {
              this.noteMissingFile(missing, file, tableName, record);
            }
          }
        }
      }
      return missing;
    } catch (e) {
      throw e;
    }
  }

  private noteMissingFile(
    missingObj: SN.MissingFileTableMap,
    file: SN.File,
    tableName: string,
    record: SN.MetaRecord
  ) {
    if (!missingObj.hasOwnProperty(tableName)) {
      missingObj[tableName] = {};
    }
    if (!missingObj[tableName].hasOwnProperty(record.sys_id)) {
      missingObj[tableName][record.sys_id] = [];
    }
    missingObj[tableName][record.sys_id].push({
      name: file.name,
      type: file.type
    });
  }
  private noteMissingRecord(
    missingObj: SN.MissingFileTableMap,
    record: SN.MetaRecord,
    tableName: string
  ) {
    for (let file of record.files) {
      this.noteMissingFile(missingObj, file, tableName, record);
    }
  }

  private noteMissingTable(
    missingObj: SN.MissingFileTableMap,
    table: SN.TableConfig,
    tableName: string
  ) {
    for (let recName in table.records) {
      let record = table.records[recName];
      this.noteMissingRecord(missingObj, record, tableName);
    }
  }

  private async loadMissingFiles(fileMap: SN.TableMap) {
    try {
      const _codeSrcPath = await getSourcePath();
      for (let tableName in fileMap) {
        let tablePath = path.join(_codeSrcPath, tableName);
        let tableConfig = fileMap[tableName];
        for (let recName in tableConfig.records) {
          let recPath = path.join(tablePath, recName);
          let record = tableConfig.records[recName];
          try {
            await fsp.access(recPath, fs.constants.F_OK);
          } catch (e) {
            await fsp.mkdir(recPath, { recursive: true });
          }
          for (let file of record.files) {
            let filePath = path.join(recPath, `${file.name}.${file.type}`);
            await fsp.writeFile(filePath, file.content || "");
          }
        }
      }
    } catch (e) {
      throw new Error("failed to load missing files");
    }
  }

  async pushSpecificFiles(skipPrompt: boolean, pathString: string) {
    if (skipPrompt || (await this.canPush())) {
      let pathPromises = pathString
        .split(path.delimiter)
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
      try {
        let fileContexts = await this.parseFileParams(paths);
        logger.info(`${fileContexts.length} files to push...`);
        logger.silly(
          JSON.stringify(fileContexts.map(ctx => ctx.filePath), null, 2)
        );

        try {
          const resultSet = await pushFiles(
            process.env.SN_INSTANCE || "",
            fileContexts
          );
          logMultiFilePush(fileContexts, true, resultSet);
        } catch (e) {
          logMultiFilePush(fileContexts, false, [], e);
        }
      } catch (e) {
        throw e;
      }
    }
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

  async pushAllFiles(skipPrompt: boolean) {
    try {
      this.pushSpecificFiles(skipPrompt, await getSourcePath());
    } catch (e) {
      throw e;
    }
  }

  async checkScope(swapScope: boolean): Promise<Sinc.ScopeCheckResult> {
    try {
      let man = await manifest;
      if (man) {
        let scopeObj = await getCurrentScope();
        if (scopeObj.scope === man.scope) {
          return {
            match: true,
            sessionScope: scopeObj.scope,
            manifestScope: man.scope
          };
        } else if (swapScope) {
          await this.swapScope(man.scope);
          // getCurrentScope cannot be trusted when changing the scope programatically
          // assuming it swapped correctly and if not let ServiceNow complain about it and throw error.
          return {
            match: true,
            sessionScope: man.scope,
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

  private async swapScope(currentScope: string): Promise<void> {
    try {
      const scopeId = await getScopeId(currentScope);
      await swapServerScope(scopeId);
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
    return fileArray.join(path.delimiter);
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
}

export default new AppManager();
