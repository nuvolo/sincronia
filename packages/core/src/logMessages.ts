import { Sinc } from "@sincronia/types";
import { logger } from "./Logger";
import chalk from "chalk";

export const log = console.log;

export function scopeCheckMessage(scopeCheck: Sinc.ScopeCheckResult) {
  let sScope = chalk.blue(scopeCheck.sessionScope);
  let mScope = chalk.blue(scopeCheck.manifestScope);

  logger.error(
    `Your user's scope is set to ${sScope} but this project is configured for the ${mScope} scope. Please switch scopes in ServiceNow to continue.`
  );
}

export function devModeLog() {
  logger.info(
    `Dev mode started! Watching for changes...[${chalk.red(
      "Press CTRL-C to Stop"
    )}]\n`
  );
}

function parseError(err: Error): string {
  return `${err.name}:
 ${err.message}
 Stack Trace:
 ${err.stack || "none"}`;
}

export function logFilePush(
  context: Sinc.FileContext,
  success: boolean,
  err?: Error
) {
  let label = chalk.bold.blue;
  logger.info(chalk.underline("File Push Summary"));
  logger.info(`${label("When:\t")}${new Date().toLocaleTimeString()}`);
  logger.info(`${label("Table:\t")}${context.tableName}`);
  logger.info(`${label("Record:\t")}${context.name}`);
  logger.info(`${label("Field:\t")}${context.targetField}`);
  let status = chalk.green("Pushed 👍");
  if (!success) {
    status = chalk.red("Failed to push 👎");
  }
  logger.info(`${label("Status:\t")}${status}`);
  if (err) {
    logger.error(parseError(err));
  }
  spacer();
}

export function logMultiFilePush(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  err?: Error
) {
  if (success) {
    let fileNum = chalk.bold.blue(
      resultSet.filter(result => result).length + ""
    );
    let message = chalk.green(`${fileNum} files successfully pushed to server`);
    logger.info(message);
  } else {
    logger.error("Failed to push files to server");
    if (err) {
      logger.error(parseError(err));
    }
  }
  spacer();
}

export function logMultiFileBuild(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  err?: Error
) {
  if (success) {
    let fileNum = chalk.bold.blue(
      resultSet.filter(result => result).length + ""
    );
    let message = chalk.green(`${fileNum} files successfully built`);
    logger.info(message);
  } else {
    logger.error("Failed to build files");
    if (err) {
      logger.error(parseError(err));
    }
  }
  spacer();
}

function spacer() {
  logger.info("");
}
