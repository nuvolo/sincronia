import dotenv from "dotenv";
import { config, manifest, getEnvPath } from "./config";

export async function init() {
  let path = await getEnvPath();
  dotenv.config({
    path
  });
  await config;
  await manifest;
  (await import("./commander")).initCommands();
}
