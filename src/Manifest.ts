import { getManifestWithFiles, getManifest, getMissingFiles } from "./server";
import fs from "fs";
import path from "path";
import { config } from "./config";

const fsp = fs.promises;

class Manifest {
  private _manifest: SNAppManifest;
  private _manifest_path: string;
  constructor() {
    this._manifest = {
      tables: {},
      scope: "none"
    };
    this._manifest_path = "sn_manifest.json";
  }

  async _loadManifest() {
    try {
      const manifest = await fsp.readFile(this._manifest_path, "utf-8");
      this._manifest = JSON.parse(manifest);
    } catch (e) {
      console.error(e);
    }
  }

  async getManifest() {
    const { scope } = this._manifest;
    if (scope === "none") {
      await this._loadManifest();
    }

    return this._manifest;
  }

  async writeManifestFile(man: SNAppManifest) {
    let mPath = path.join(process.cwd(), this._manifest_path);
    return fsp.writeFile(mPath, JSON.stringify(man, null, 2));
  }

  async _writeNewFiles(
    file: SNFile,
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

  async _createNewFiles(manifest: SNAppManifest, skipFileCheck: boolean) {
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
          await this._writeNewFiles(file, recPath, content, skipFileCheck);
          delete file.content;
        }
      }
    }
  }

  async _processManifest(
    manifest: SNAppManifest,
    skipFileCheckOnFileGeneration?: boolean
  ) {
    if (
      !skipFileCheckOnFileGeneration &&
      typeof skipFileCheckOnFileGeneration !== "boolean"
    ) {
      skipFileCheckOnFileGeneration = false;
    }
    const skipFileCheck = skipFileCheckOnFileGeneration;
    this._manifest = manifest;
    await this._createNewFiles(manifest, skipFileCheck);
    await this.writeManifestFile(manifest);
  }

  async downloadWithFiles(
    scope: string,
    skipFileCheck?: boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      getManifestWithFiles(scope)
        .then(async (man: SNAppManifest) => {
          try {
            this._processManifest(man, skipFileCheck);
            resolve();
          } catch (e) {
            reject(e);
          }
        })
        .catch(e => {
          console.error(e);
        });
    });
  }
  async syncManifest() {
    try {
      if (this._manifest.scope === "none") {
        throw new Error("No manifest file loaded!");
      }
      // const skipFileCheck = false;
      // return this.downloadWithFiles(this._manifest.scope, skipFileCheck);
      let manifest = await getManifest(this._manifest.scope);
      this._manifest = manifest;
      this.reconcileDifferences(manifest);
    } catch (e) {
      console.error(e);
    }
  }

  async reconcileDifferences(manifest: SNAppManifest) {
    try {
      let missing = await this.determineMissing(manifest);
      let missingFileMap = await getMissingFiles(missing);
      await this.loadMissingFiles(missingFileMap);
      console.log("sync complete!");
    } catch (e) {
      throw e;
    }
  }

  async determineMissing(
    manifest: SNAppManifest
  ): Promise<SNCDMissingFileTableMap> {
    try {
      let missing: SNCDMissingFileTableMap = {};
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

  noteMissingFile(
    missingObj: SNCDMissingFileTableMap,
    file: SNFile,
    tableName: string,
    record: SNMetaRecord
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
  noteMissingRecord(
    missingObj: SNCDMissingFileTableMap,
    record: SNMetaRecord,
    tableName: string
  ) {
    for (let file of record.files) {
      this.noteMissingFile(missingObj, file, tableName, record);
    }
  }

  noteMissingTable(
    missingObj: SNCDMissingFileTableMap,
    table: SNTableConfig,
    tableName: string
  ) {
    for (let recName in table.records) {
      let record = table.records[recName];
      this.noteMissingRecord(missingObj, record, tableName);
    }
  }

  async loadMissingFiles(fileMap: SNTableMap) {
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
}

export default new Manifest();
