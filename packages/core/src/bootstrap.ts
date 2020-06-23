import dotenv from "dotenv";
import ConfigManager from "./config";

export async function init() {
  try {
    await ConfigManager.loadConfigs();
  } catch (e) {
    console.log(e);
  }
  
  let path = ConfigManager.getEnvPath();
  dotenv.config({
    path
  });
  (await import("./commander")).initCommands();
}
