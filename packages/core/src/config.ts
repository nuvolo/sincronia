import { SN, Sinc } from "@sincronia/types";
import path from "path";
import fs from "fs";
const fsp = fs.promises;
import * as logger from "./logging";
import { includes, excludes } from "./defaultManifestConfig";

export const CONFIG_FILE_PATH = path.join(process.cwd(), "sinc.config.js");
export const MANIFEST_FILE_PATH = path.join(
  process.cwd(),
  "sinc.manifest.json"
);
export const DEFAULT_CONFIG: Sinc.Config = {
  sourceDirectory: "src",
  rules: [],
  includes: {},
  excludes: {}
};

export const DEFAULT_CONFIG_FILE: string = `
module.exports = {
  sourceDirectory: "src",
  rules: [],
  excludes:{},
  includes:{}
};
`.trim();

async function _getConfig(): Promise<Sinc.Config> {
  try {
    let projectConfig: Sinc.Config = (await import(CONFIG_FILE_PATH)).default;
    //merge in includes/excludes
    let { includes: pIncludes = {}, excludes: pExcludes = {} } = projectConfig;
    projectConfig.includes = Object.assign(includes, pIncludes);
    projectConfig.excludes = Object.assign(excludes, pExcludes);
    return projectConfig;
  } catch (e) {
    logger.info("No configuration file found, loading default...");
    return DEFAULT_CONFIG;
  }
}

async function _getManifest(): Promise<SN.AppManifest | undefined> {
  try {
    let manifestString = await fsp.readFile(MANIFEST_FILE_PATH, "utf-8");
    return JSON.parse(manifestString);
  } catch (e) {
    return undefined;
  }
}

export const config = _getConfig();
export const manifest = _getManifest();
