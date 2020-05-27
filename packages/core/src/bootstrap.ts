import dotenv from "dotenv";
import { loadStartupFiles } from "./config";

export async function init() {
  try {
    await loadStartupFiles();
  } catch (e) {
    console.log(e);
  }
  let path = (await import("./config")).env_path;
  dotenv.config({
    path
  });
  (await import("./commander")).initCommands();
}
