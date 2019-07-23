import path from "path";
import { config } from "./config";
import Watcher from "./Watcher";
import AppManager from "./AppManager";

export async function devCommand() {
  const { sourceDirectory } = await config;
  const _codeSrcPath = path.join(process.cwd(), sourceDirectory);
  Watcher.startWatching(_codeSrcPath);
  console.log("Dev mode started!");
}
export async function refreshCommand() {
  try {
    await AppManager.syncManifest();
    console.log("Sync Complete!");
  } catch (e) {
    throw e;
  }
}
export async function pushCommand() {
  try {
    await AppManager.pushAllFiles();
    console.log("Push Complete!");
  } catch (e) {
    throw e;
  }
}
export async function downloadCommand(args: Sinc.CmdDownloadArgs) {
  try {
    await AppManager.downloadWithFiles(args.scope as string);
    console.log("Download Complete!");
  } catch (e) {
    throw e;
    //console.error(e);
  }
}
