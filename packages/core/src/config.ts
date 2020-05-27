import { SN, Sinc } from "@sincronia/types";
import path from "path";
import { promises as fsp } from "fs";
import { logger } from "./Logger";
import { includes, excludes, tableOptions } from "./defaultOptions";

export const DEFAULT_CONFIG: Sinc.Config = {
  sourceDirectory: "src",
  rules: [],
  includes,
  excludes,
  tableOptions: {}
};

export const DEFAULT_CONFIG_FILE: string = `
module.exports = {
  sourceDirectory: "src",
  rules: [],
  excludes:{},
  includes:{},
  tableOptions:{}
};
`.trim();

export let root_dir: string;
export let config: Sinc.Config;
export let manifest: SN.AppManifest;
export let config_path: string;
export let source_path: string;
export let env_path: string;
export let manifest_path: string;

export async function loadStartupFiles() {
  //Ordered due to config dependencies within promises
  await _getConfigPath()
    .then(_config_path => {
      if (_config_path) config_path = _config_path;
      else logger.error("Error loading config path");
    })
    .then(_getRootDir)
    .then(_root_dir => {
      if (_root_dir) root_dir = _root_dir;
      else logger.error("Error loading root directory");
    })
    .then(_getConfig)
    .then(_config => {
      if (_config) config = _config;
      else logger.error("Error loading config file");
    })
    .then(_getEnvPath)
    .then(_env_path => {
      if (_env_path) env_path = _env_path;
      else logger.error("Error loading env path");
    })
    .then(_getSourcePath)
    .then(_source_path => {
      if (_source_path) source_path = _source_path;
      else logger.error("Error loading source path");
    })
    .then(_getManifestPath)
    .then(_manifest_path => {
      if (_manifest_path) manifest_path = _manifest_path;
      else logger.error("Error loading manifest path");
    })
    .then(_getManifest)
    .then(_manifest => {
      if (_manifest) manifest = _manifest;
      else logger.error("Error loading manifest");
    })
    .catch(e => {
      throw e;
    });
}

async function _getConfig(): Promise<Sinc.Config> {
  try {
    if (config_path) {
      let projectConfig: Sinc.Config = (await import(config_path)).default;
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

async function _getManifest(): Promise<SN.AppManifest | undefined> {
  try {
    let manifestString = await fsp.readFile(manifest_path, "utf-8");
    return JSON.parse(manifestString);
  } catch (e) {
    return undefined;
  }
}

async function _getConfigPath(pth?: string): Promise<string | false> {
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
    return _getConfigPath(path.dirname(pth));
  }
  function isRoot(pth: string) {
    return path.parse(pth).root === pth;
  }
}

async function _getSourcePath() {
  let rootDir = root_dir;
  let { sourceDirectory = "src" } = config;
  return path.join(rootDir, sourceDirectory);
}

async function _getEnvPath() {
  let rootDir = root_dir;
  return path.join(rootDir, ".env");
}

async function _getManifestPath() {
  let rootDir = root_dir;
  return path.join(rootDir, "sinc.manifest.json");
}

async function _getRootDir() {
  let configPath = config_path;
  let rootDir;
  if (configPath) {
    rootDir = path.dirname(configPath);
  } else {
    rootDir = process.cwd();
  }
  return rootDir;
}
