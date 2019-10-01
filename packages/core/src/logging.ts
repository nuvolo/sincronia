import { Sinc } from "@sincronia/types";
import chalk from "chalk";

export const log = console.log;

export function info(text: string) {
  console.info(chalk.blue(text));
}

export function error(text: string) {
  console.error(chalk.red(text));
}

export function warn(text: string) {
  console.warn(chalk.yellow(text));
}

export function success(text: string) {
  console.info(chalk.green(text));
}

export function scopeCheckMessage(scopeCheck: Sinc.ScopeCheckResult) {
  let sScope = chalk.blue(scopeCheck.sessionScope);
  let mScope = chalk.blue(scopeCheck.manifestScope);
  console.error(
    chalk.red(
      `Your user's scope is set to ${sScope} but this project is configured for the ${mScope} scope. Please switch scopes in ServiceNow to continue.`
    )
  );
}

export function devModeLog() {
  console.log(
    `Dev mode started! Watching for changes...[${chalk.red(
      "Press CTRL-C to Stop"
    )}]\n`
  );
}

export function logFilePush(
  context: Sinc.FileContext,
  success: boolean,
  err?: Error
) {
  let label = chalk.bold.blue;
  console.log(chalk.underline("File Push Summary"));
  console.log(label("When:\t"), new Date().toLocaleTimeString());
  console.log(label("Table:\t"), context.tableName);
  console.log(label("Record:\t"), context.name);
  console.log(label("Field:\t"), context.targetField);
  let status = chalk.green("Pushed 👍");
  if (!success) {
    status = chalk.red("Failed to push 👎");
  }
  console.log(label("Status:\t"), status);
  if (err) {
    console.log(err);
  }
  spacer();
}

export function logMultiFilePush(
  files: Sinc.FileContext[],
  success: boolean,
  err?: Error
) {
  if (success) {
    let fileNum = chalk.bold.blue(files.length + "");
    let message = chalk.green(`${fileNum} files successfully pushed to server`);
    console.info(message);
  } else {
    error("Failed to push files to server");
    if (err) {
      console.error(err);
    }
  }
  spacer();
}

function spacer() {
  console.log("");
}
