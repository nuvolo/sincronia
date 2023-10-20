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
};

let root_dir: string | undefined;
let config: Sinc.Config | undefined;
let manifest: SN.AppManifest | undefined;
let config_path: string | undefined;
let source_path: string | undefined;
let build_path: string | undefined;
let env_path: string | undefined;
let manifest_path: string | undefined;
let diff_path: string | undefined;
let diff_file: Sinc.DiffFile | undefined;
let refresh_interval: number | undefined;

export const loadConfigs = async () => {
  try {
    let noConfigPath = false; //Prevents logging error messages during init
    const path = await loadConfigPath();
    if (path) config_path = path;
    else noConfigPath = true;

    await loadRootDir(noConfigPath);

    const cfg = await loadConfig(noConfigPath);
    if (cfg) config = cfg;

    await loadEnvPath();
    await loadSourcePath();
    await loadBuildPath();
    await loadManifestPath();
    await loadManifest();
    await loadDiffPath();
    await loadDiffFile();
    await loadRefresh();
  } catch (e) {
    throw e;
  }
};

export function getConfig() {
  if (config) return config;
  throw new Error("Error getting config");
}

export function getConfigPath() {
  if (config_path) return config_path;
  throw new Error("Error getting config path");
}

export function checkConfigPath() {
  if (config_path) return config_path;
  return false;
}

export function getRootDir() {
  if (root_dir) return root_dir;
  throw new Error("Error getting root directory");
}

export function getManifest(setup = false) {
  if (manifest) return manifest;
  if (!setup) throw new Error("Error getting manifest");
}

export function getManifestPath() {
  if (manifest_path) return manifest_path;
  throw new Error("Error getting manifest path");
}

export function getSourcePath() {
  if (source_path) return source_path;
  throw new Error("Error getting source path");
}

export function getBuildPath() {
  if (build_path) return build_path;
  throw new Error("Error getting build path");
}

export function getEnvPath() {
  if (env_path) return env_path;
  throw new Error("Error getting env path");
}

export function getDiffPath() {
  if (diff_path) return diff_path;
  throw new Error("Error getting diff path");
}

export function getDiffFile() {
  if (diff_file) return diff_file;
  throw new Error("Error getting diff file");
}

export function getRefresh() {
  if (refresh_interval) return refresh_interval;
  throw new Error("Error getting refresh interval");
}

export function getDefaultConfigFile(): string {
  return `
    module.exports = {
      sourceDirectory: "src",
      buildDirectory: "build",
      rules: [],
      excludes:{},
      includes:{},
      tableOptions:{},
      refreshInterval:30
    };
    `.trim();
}

async function loadConfig(skipConfigPath = false): Promise<Sinc.Config> {
  if (skipConfigPath) {
    logger.warn("Couldn't find config file. Loading default...");
    return DEFAULT_CONFIG;
  }
  try {
    let configPath = getConfigPath();
    if (configPath) {
      let projectConfig: Sinc.Config = (await import(configPath)).default;
      //merge in includes/excludes
      let {
        includes: pIncludes = {},
        excludes: pExcludes = {},
        tableOptions: pTableOptions = {},
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
    let message
    if (e instanceof Error) message = e.message
    else message = String(e)
    logger.warn(message);
    logger.warn("Couldn't find config file. Loading default...");
    return DEFAULT_CONFIG;
  }
}

async function loadManifest() {
  try {
    let manifestString = await fsp.readFile(getManifestPath(), "utf-8");
    manifest = JSON.parse(manifestString);
  } catch (e) {
    manifest = undefined;
  }
}

export function updateManifest(man: SN.AppManifest) {
  manifest = man;
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

async function loadRefresh() {
  let { refreshInterval = 30 } = getConfig();
  refresh_interval = refreshInterval;
}

async function loadSourcePath() {
  let rootDir = getRootDir();
  let { sourceDirectory = "src" } = getConfig();
  source_path = path.join(rootDir, sourceDirectory);
}

async function loadBuildPath() {
  let rootDir = getRootDir();
  let { buildDirectory = "build" } = getConfig();
  build_path = path.join(rootDir, buildDirectory);
}

async function loadEnvPath() {
  let rootDir = getRootDir();
  env_path = path.join(rootDir, ".env");
}

async function loadManifestPath() {
  let rootDir = getRootDir();
  manifest_path = path.join(rootDir, "sinc.manifest.json");
}

async function loadDiffPath() {
  let rootDir = getRootDir();
  diff_path = path.join(rootDir, "sinc.diff.manifest.json");
}

async function loadDiffFile() {
  try {
    let diffString = await fsp.readFile(getDiffPath(), "utf-8");
    diff_file = JSON.parse(diffString);
  } catch (e) {
    diff_file = undefined;
  }
}

async function loadRootDir(skip?: boolean) {
  if (skip) {
    root_dir = process.cwd();
    return;
  }
  let configPath = getConfigPath();
  if (configPath) root_dir = path.dirname(configPath);
  else root_dir = process.cwd();
}
