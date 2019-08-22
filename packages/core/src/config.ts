import { SN, Sinc } from "@sincronia/types";
import path from "path";
import fs from "fs";
const fsp = fs.promises;
import * as logger from "./logging";

export const CONFIG_FILE_PATH = path.join(process.cwd(), "sinc.config.js");
export const MANIFEST_FILE_PATH = path.join(
  process.cwd(),
  "sinc.manifest.json"
);
export const DEFAULT_CONFIG: Sinc.Config = {
  sourceDirectory: "src",
  ignoreDirectories: ["node_modules"],
  rules: []
};

export const DEFAULT_CONFIG_FILE: string = `
module.exports = {
  sourceDirectory: "src",
  ignoreDirectories: ["node_modules"],
  rules: []
};
`.trim();

async function _getConfig(): Promise<Sinc.Config> {
  try {
    return await import(CONFIG_FILE_PATH);
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
