import { SN, Sinc } from "@sincronia/types";
import path from "path";
import { promises as fsp } from "fs";
import { logger } from "./Logger";
import { includes, excludes, tableOptions } from "./defaultOptions";

const DEFAULT_CONFIG: Sinc.Config = {
  sourceDirectory: "src",
  buildDirectory: "build",
  rules: [],
  includes,
  excludes,
  tableOptions: {},
  refreshInterval: 30,
  fileDelimiter: ":"
};

let ConfigManager = new (class {
  private root_dir: string | undefined;
  private config: Sinc.Config | undefined;
  private manifest: SN.AppManifest | undefined;
  private config_path: string | undefined;
  private source_path: string | undefined;
  private build_path: string | undefined;
  private env_path: string | undefined;
  private manifest_path: string | undefined;
  private diff_path: string | undefined;
  private diff_file: Sinc.DiffFile | undefined;
  private refresh_interval: number | undefined;
  private file_delimiter: string | undefined;

  constructor() {}

  async loadConfigs() {
    try {
      let noConfigPath = false; //Prevents logging error messages during init
      const config_path = await this.loadConfigPath();
      if (config_path) this.config_path = config_path;
      else noConfigPath = true;

      const root = await this.loadRootDir(noConfigPath);
      if (root) this.root_dir = root;

      const config = await this.loadConfig(noConfigPath);
      if (config) this.config = config;

      const env = await this.loadEnvPath();
      if (env) this.env_path = env;

      const source = await this.loadSourcePath();
      if (source) this.source_path = source;

      const build = await this.loadBuildPath();
      if (build) this.build_path = build;

      const manifest_path = await this.loadManifestPath();
      if (manifest_path) this.manifest_path = manifest_path;

      const manifest = await this.loadManifest();
      if (manifest) this.manifest = manifest;

      const diff = await this.loadDiffPath();
      if (diff) this.diff_path = diff;

      const diff_file = await this.loadDiffFile();
      if (diff_file) this.diff_file = diff_file;

      const refresh = await this.loadRefresh();
      if (refresh) this.refresh_interval = refresh;

      const file_delimiter = await this.loadFileDelimiter();
      if (file_delimiter) this.file_delimiter = file_delimiter;
    } catch (e) {
      throw e;
    }
  }

  getConfig() {
    if (this.config) return this.config;
    throw new Error("Error getting config");
  }

  getConfigPath() {
    if (this.config_path) return this.config_path;
    throw new Error("Error getting config path");
  }

  checkConfigPath() {
    if (this.config_path) return this.config_path;
    return false;
  }

  getRootDir() {
    if (this.root_dir) return this.root_dir;
    throw new Error("Error getting root directory");
  }

  getManifest(setup = false) {
    if (this.manifest) return this.manifest;
    if (!setup) throw new Error("Error getting manifest");
  }

  getManifestPath() {
    if (this.manifest_path) return this.manifest_path;
    throw new Error("Error getting manifest path");
  }

  getSourcePath() {
    if (this.source_path) return this.source_path;
    throw new Error("Error getting source path");
  }

  getBuildPath() {
    if (this.build_path) return this.build_path;
    throw new Error("Error getting build path");
  }

  getEnvPath() {
    if (this.env_path) return this.env_path;
    throw new Error("Error getting env path");
  }

  getDiffPath() {
    if (this.diff_path) return this.diff_path;
    throw new Error("Error getting diff path");
  }

  getDiffFile() {
    if (this.diff_file) return this.diff_file;
    throw new Error("Error getting diff file");
  }

  getRefresh() {
    if (this.refresh_interval) return this.refresh_interval;
    throw new Error("Error getting refresh interval");
  }

  getFileDelimiter() {
    if (this.file_delimiter) return this.file_delimiter;
    throw new Error("Error getting file delimiter");
  }

  getDefaultConfigFile(): string {
    return `module.exports = ${JSON.stringify(DEFAULT_CONFIG)};`.trim();
  }

  private async loadConfig(skipConfigPath = false): Promise<Sinc.Config> {
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

  private async loadManifest(): Promise<SN.AppManifest | undefined> {
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

  updateManifest(man: SN.AppManifest) {
    this.manifest = man;
  }

  private async loadConfigPath(pth?: string): Promise<string | false> {
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
      return this.loadConfigPath(path.dirname(pth));
    }
    function isRoot(pth: string) {
      return path.parse(pth).root === pth;
    }
  }

  private async loadRefresh() {
    let {
      refreshInterval = DEFAULT_CONFIG.refreshInterval
    } = ConfigManager.getConfig();
    return refreshInterval;
  }

  private async loadSourcePath() {
    let rootDir = ConfigManager.getRootDir();
    let {
      sourceDirectory = DEFAULT_CONFIG.sourceDirectory
    } = ConfigManager.getConfig();
    return path.join(rootDir, sourceDirectory);
  }

  private async loadBuildPath() {
    let rootDir = ConfigManager.getRootDir();
    let {
      buildDirectory = DEFAULT_CONFIG.buildDirectory
    } = ConfigManager.getConfig();
    return path.join(rootDir, buildDirectory);
  }

  private async loadEnvPath() {
    let rootDir = ConfigManager.getRootDir();
    return path.join(rootDir, ".env");
  }

  private async loadManifestPath() {
    let rootDir = ConfigManager.getRootDir();
    return path.join(rootDir, "sinc.manifest.json");
  }

  private async loadDiffPath() {
    let rootDir = ConfigManager.getRootDir();
    return path.join(rootDir, "sinc.diff.manifest.json");
  }

  private async loadDiffFile() {
    try {
      let diffString = await fsp.readFile(ConfigManager.getDiffPath(), "utf-8");
      return JSON.parse(diffString);
    } catch (e) {
      return undefined;
    }
  }

  private async loadRootDir(skip?: boolean) {
    if (skip) return process.cwd();
    let configPath = ConfigManager.getConfigPath();
    if (configPath) {
      return path.dirname(configPath);
    } else {
      return process.cwd();
    }
  }

  private async loadFileDelimiter() {
    let {
      fileDelimiter = DEFAULT_CONFIG.fileDelimiter
    } = ConfigManager.getConfig();
    return fileDelimiter;
  }
})();

export default ConfigManager;
