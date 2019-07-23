import {
  devCommand,
  refreshCommand,
  pushCommand,
  downloadCommand
} from "./commands";
import AppManager from "./AppManager";
import yargs from "yargs";
export async function initCommands() {
  let scopeCheck = await AppManager.checkScope();
  if (!scopeCheck.match) {
    console.log(
      `Your user's scope is set to ${scopeCheck.sessionScope} but this project is configured for the ${scopeCheck.manifestScope} scope. Please switch scopes in ServiceNow to continue.`
    );
  } else {
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
}
