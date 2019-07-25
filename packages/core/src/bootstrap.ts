import dotenv from "dotenv";
dotenv.config();
import * as Commander from "./commander";
import { config, manifest } from "./config";

export async function init() {
  await config;
  await manifest;
  Commander.initCommands();
}
