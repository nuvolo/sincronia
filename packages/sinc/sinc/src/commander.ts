import {
  devCommand,
  refreshCommand,
  pushCommand,
  downloadCommand
} from "./commands";
import yargs from "yargs";
export function initCommands() {
  yargs
    .command(["dev", "d"], "Start Development Mode", {}, devCommand)
    .command(
      ["refresh", "r"],
      "Refresh Manifest and download new files since last refresh",
      {},
      refreshCommand
    )
    .command(
      ["push"],
      "[DESTRUCTIVE] Push all files from current local files to ServiceNow instance.",
      {},
      pushCommand
    )
    .command(
      "download [scope]",
      "Downloads a scoped application's files from ServiceNow. Must specify a scope prefix for a scoped app.",
      {},
      (args: TSFIXME) => {
        downloadCommand(args as Sinc.CmdDownloadArgs);
      }
    )
    .help().argv;
}
