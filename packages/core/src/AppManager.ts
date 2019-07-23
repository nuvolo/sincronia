import {
  getManifestWithFiles,
  getManifest,
  getMissingFiles,
  pushFiles
} from "./server";
import fs from "fs";
import path from "path";
import { config, manifest, MANIFEST_FILE_PATH } from "./config";
import * as Utils from "./utils";
//import { pushFiles } from "./filePusher";

const fsp = fs.promises;

class AppManager {
  constructor() {}

  private async writeManifestFile(man: SN.AppManifest) {
    return fsp.writeFile(MANIFEST_FILE_PATH, JSON.stringify(man, null, 2));
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
        let reg = new RegExp(file.name + ".*$");
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
    const { sourceDirectory = "src" } = (await config) || {};
    const { tables } = manifest;
    const _codeSrcPath = path.join(process.cwd(), sourceDirectory);
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

  private async _processManifest(
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
    return new Promise((resolve, reject) => {
      getManifestWithFiles(scope)
        .then(async (man: SN.AppManifest) => {
          try {
            this._processManifest(man, skipFileCheck);
            console.log("Push Complete!");
            resolve();
          } catch (e) {
            reject(e);
          }
        })
        .catch(e => {
          throw e;
        });
    });
  }
  async syncManifest() {
    try {
      let curManifest = await manifest;
      if (!curManifest) {
        throw new Error("No manifest file loaded!");
      }
      let newManifest = await getManifest(curManifest.scope);
      this.writeManifestFile(newManifest);
      await this.reconcileDifferences(newManifest);
    } catch (e) {
      throw e;
      //console.error(e);
    }
  }

  private async reconcileDifferences(manifest: SN.AppManifest) {
    try {
      let missing = await this.determineMissing(manifest);
      let missingFileMap = await getMissingFiles(missing);
      await this.loadMissingFiles(missingFileMap);
      console.log("Sync complete!");
    } catch (e) {
      throw e;
    }
  }

  private async determineMissing(
    manifest: SN.AppManifest
  ): Promise<SN.MissingFileTableMap> {
    try {
      let missing: SN.MissingFileTableMap = {};
      const { sourceDirectory = "src" } = (await config) || {};
      const _codeSrcPath = path.join(process.cwd(), sourceDirectory);
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
      const { sourceDirectory = "src" } = (await config) || {};
      const _codeSrcPath = path.join(process.cwd(), sourceDirectory);
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
      return;
    }
  }

  private async parseFileParams(files: string[]) {
    return await Utils.getParsedFilesPayload(files);
  }

  private async loadList(): Promise<string[]> {
    let list: string[] = [];
    const { sourceDirectory = "src" } = (await config) || {};
    let subDirectory = path.join(process.cwd(), sourceDirectory);
    await this.loaddir(subDirectory, list);
    return list;
  }

  private async getLocalFilesList() {
    const files = await this.loadList();
    return this.parseFileParams(files);
  }

  async pushAllFiles() {
    let filePayload = await this.getLocalFilesList();
    const targetServer = process.env.SN_INSTANCE || "";
    if (!targetServer) {
      console.error("No server configured for push!");
      return;
    }
    await pushFiles(targetServer, filePayload);
    console.log("Push complete!");
  }
}

export default new AppManager();
