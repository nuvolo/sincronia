import { SN, Sinc } from "@sincronia/types";
import path from "path";
import { promises as fsp } from "fs";
import { logger } from "./Logger";
import { includes, excludes, tableOptions } from "./defaultOptions";
import { Config } from "winston/lib/winston/config";

const DEFAULT_CONFIG: Sinc.Config = {
  sourceDirectory: "src",
  rules: [],
  includes,
  excludes,
  tableOptions: {}
};

let ConfigManager = new (class {
  private root_dir: string | undefined;
  private config: Sinc.Config | undefined;
  private manifest: SN.AppManifest | undefined;
  private config_path: string | undefined;
  private source_path: string | undefined;
  private env_path: string | undefined;
  private manifest_path: string | undefined;
  constructor() {}

  async loadStartupFiles() {
    //Ordered due to config dependencies within loads
    let skipConfigPath = false; //Prevents logging error messages during init
    await loadConfigPath()
      .then(_config_path => {
        if (_config_path) this.config_path = _config_path;
        else skipConfigPath = true;
      })
      .then(() => {
        return loadRootDir(skipConfigPath);
      })
      .then(_root_dir => {
        if (_root_dir) this.root_dir = _root_dir;
      })
      .then(() => {
        return loadConfig(skipConfigPath);
      })
      .then(_config => {
        if (_config) this.config = _config;
      })
      .then(loadEnvPath)
      .then(_env_path => {
        if (_env_path) this.env_path = _env_path;
      })
      .then(loadSourcePath)
      .then(_source_path => {
        if (_source_path) this.source_path = _source_path;
      })
      .then(loadManifestPath)
      .then(_manifest_path => {
        if (_manifest_path) this.manifest_path = _manifest_path;
      })
      .then(loadManifest)
      .then(_manifest => {
        if (_manifest) this.manifest = _manifest;
      })
      .catch(e => {
        throw e;
      });
  }

  getConfig(setup = false) {
    if (this.config) return this.config;
    logger.error("Error getting config");
    return DEFAULT_CONFIG;
  }

  getConfigPath() {
    if (this.config_path) return this.config_path;
    logger.error("Error getting config path");
    return "";
  }

  checkConfigPath() {
    if (this.config_path) return this.config_path;
    return false;
  }

  getRootDir() {
    if (this.root_dir) return this.root_dir;
    logger.error("Error getting root directory");
    return "";
  }

  getManifest(setup = false) {
    if (this.manifest) return this.manifest;
    if (!setup) logger.error("Error getting manifest");
  }

  getManifestPath() {
    if (this.manifest_path) return this.manifest_path;
    logger.error("Error getting manifest path");
    return "";
  }

  getSourcePath() {
    if (this.source_path) return this.source_path;
    logger.error("Error getting source path");
    return "";
  }

  getEnvPath() {
    if (this.env_path) return this.env_path;
    logger.error("Error getting env path");
    return "";
  }

  getDefaultConfigFile(): string {
    return `
    module.exports = {
      sourceDirectory: "src",
      rules: [],
      excludes:{},
      includes:{},
      tableOptions:{}
    };
    `.trim();
  }
})();

async function loadConfig(skipConfigPath = false): Promise<Sinc.Config> {
  if (skipConfigPath) {
    logger.warn("Couldn't find config file. Loading default...");
    return DEFAULT_CONFIG;
  }
  try {
    let configPath = ConfigManager.getConfigPath();
    if (configPath) {
      let projectConfig: Sinc.Config = (await import(configPath)).default;
      //merge in includes/excludes
      let {
        includes: pIncludes = {},
        excludes: pExcludes = {},
        tableOptions: pTableOptions = {}
      } = projectConfig;
      projectConfig.includes = Object.assign(includes, pIncludes);
      projectConfig.excludes = Object.assign(excludes, pExcludes);
      projectConfig.tableOptions = Object.assign(tableOptions, pTableOptions);
      return projectConfig;
    } else {
      logger.warn("Couldn't find config file. Loading default...");
      return DEFAULT_CONFIG;
    }
  } catch (e) {
    logger.warn(e);
    logger.warn("Couldn't find config file. Loading default...");
    return DEFAULT_CONFIG;
  }
}

async function loadManifest(): Promise<SN.AppManifest | undefined> {
  try {
    let manifestString = await fsp.readFile(
      ConfigManager.getManifestPath(),
      "utf-8"
    );
    return JSON.parse(manifestString);
  } catch (e) {
    return undefined;
  }
}

async function loadConfigPath(pth?: string): Promise<string | false> {
  if (!pth) {
    pth = process.cwd();
  }
  // check to see if config is found
  let files = await fsp.readdir(pth);
  if (files.includes("sinc.config.js")) {
    return path.join(pth, "sinc.config.js");
  } else {
    if (isRoot(pth)) {
      return false;
    }
    return loadConfigPath(path.dirname(pth));
  }
  function isRoot(pth: string) {
    return path.parse(pth).root === pth;
  }
}

async function loadSourcePath() {
  let rootDir = ConfigManager.getRootDir();
  let { sourceDirectory = "src" } = ConfigManager.getConfig();
  return path.join(rootDir, sourceDirectory);
}

async function loadEnvPath() {
  let rootDir = ConfigManager.getRootDir();
  return path.join(rootDir, ".env");
}

async function loadManifestPath() {
  let rootDir = ConfigManager.getRootDir();
  return path.join(rootDir, "sinc.manifest.json");
}

async function loadRootDir(skip?: boolean) {
  if (skip) return process.cwd();
  let configPath = ConfigManager.getConfigPath();
  if (configPath) {
    return path.dirname(configPath);
  } else {
    return process.cwd();
  }
}

export default ConfigManager;
