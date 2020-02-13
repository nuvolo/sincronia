import { Sinc, TSFIXME } from "@sincronia/types";
import {
  devCommand,
  refreshCommand,
  pushCommand,
  downloadCommand,
  initCommand
} from "./commands";
import yargs from "yargs";
export async function initCommands() {
  const sharedOptions = {
    logLevel: {
      default: "info"
    }
  };

  yargs
    .command(["dev", "d"], "Start Development Mode", sharedOptions, devCommand)
    .command(
      ["refresh", "r"],
      "Refresh Manifest and download new files since last refresh",
      sharedOptions,
      refreshCommand
    )
    .command(
      ["push [target]"],
      "[DESTRUCTIVE] Push all files from current local files to ServiceNow instance.",
      cmdArgs => {
        cmdArgs.options({
          diff: {
            alias: "d",
            type: "string",
            default: "",
            describe: "Specify branch to do git diff against"
          },
          scopeSwap: {
            alias: "ss",
            type: "boolean",
            default: false,
            describe:
              "Will auto-swap to the correct scope for the files being pushed"
          },
          ci: {
            type: "boolean",
            default: false,
            describe: "Will skip confirmation prompts during the push process"
          }
        });
        return cmdArgs;
      },
      (args: TSFIXME) => {
        pushCommand(args as Sinc.PushCmdArgs);
      }
    )
    .command(
      "download <scope>",
      "Downloads a scoped application's files from ServiceNow. Must specify a scope prefix for a scoped app.",
      sharedOptions,
      (args: TSFIXME) => {
        downloadCommand(args as Sinc.CmdDownloadArgs);
      }
    )
    .command(
      "init",
      "Provisions an initial project for you",
      sharedOptions,
      initCommand
    )
    .help().argv;
}
