import dotenv from "dotenv";
dotenv.config();
import args from "yargs";
import { crawl } from "./SourceCrawler";
import Manifest from "./Manifest";
import { Watcher } from "./Watcher";
import { pushFiles } from "./filePusher";
import { getParsedFilesPayload } from "./fileUtil";
import { config } from "./config";
import path from "path";

export async function init() {
  args
    .command("dev", "Start development mode", {}, async () => {
      const { sourceDirectory = "src" } = (await config) || {};
      const _codeSrcPath = path.join(process.cwd(), sourceDirectory);
      let w = new Watcher();
      w.startWatching(_codeSrcPath, {
        change: async (path: string) => {
          let payload = await getParsedFilesPayload([path]);
          const targetServer =
            process.env.SN_INSTANCE ||
            console.error("No server configured for push!") ||
            "";
          if (targetServer) {
            await pushFiles(targetServer, payload);
            console.log(`${path} pushed to server!`);
          }
        }
      });
      console.log("Dev mode started!");
    })
    .command("sync", "Sync file list from ServiceNow", {}, async () => {
      try {
        await Manifest.getManifest();
        await Manifest.syncManifest();
        console.log("Sync Complete!");
      } catch (e) {
        throw e;
      }
    })
    .command("push", "Push all files to SN instance", {}, async () => {
      //read their config.js
      //read their .env
      //crawl the filesystem
      const filePayload = await crawl(process.cwd());
      const targetServer =
        process.env.SN_INSTANCE ||
        console.error("No server configured for push!") ||
        "";
      if (targetServer) {
        await pushFiles(targetServer, filePayload);
        console.log("Push Complete!");
      }
    })
    .command(
      "download [scope]",
      "Downloads all files for a scoped application",
      {},
      args => {
        Manifest.downloadWithFiles(args.scope as string)
          .then(() => {
            console.log("Download Complete!");
          })
          .catch(e => {
            console.error(e);
          });
      }
    )
    .help().argv;
}
