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
  res: Sinc.PushResult
): void {
  const { message, success } = res;
  const label = chalk.bold.blue;
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
  if (!success) {
    logger.error(message);
  }
  spacer();
}

function multiLog(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  successMessage: string,
  errorMessage: string,
  err?: Error
) {
  if (success) {
    let fileNum = chalk.bold.blue(
      resultSet.filter(result => result).length + ""
    );
    let message = chalk.green(`${fileNum} files ${successMessage}`);
    logger.info(message);
  } else {
    logger.error(errorMessage);
    if (err) {
      logger.error(parseError(err));
    }
  }
  spacer();
}

export function logMultiFilePush(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  err?: Error
) {
  multiLog(
    files,
    success,
    resultSet,
    "successfully pushed to server",
    "Failed to push files to server",
    err
  );
}

export function logMultiFileBuild(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  err?: Error
) {
  multiLog(
    files,
    success,
    resultSet,
    "successfully built",
    "Failed to build files",
    err
  );
}

export function logDeploy(
  files: Sinc.FileContext[],
  success: boolean,
  resultSet: boolean[],
  err?: Error
) {
  multiLog(
    files,
    success,
    resultSet,
    "successfully deployed",
    "Failed to deploy files",
    err
  );
}

function spacer() {
  logger.info("");
}

export const logPushResults = (results: Sinc.PushResult[]): void => {
  const unsuccessful = results.filter(r => !r.success);
  const logr = logger.getInternalLogger();
  const label = (content: string) => chalk.bold.blue(content);
  const success = (content: string) => chalk.bold.green(content);
  const fail = (content: string) => chalk.bold.red(content);
  logr.info(`${label("Total Records:")} ${results.length}`);
  logr.info(
    `${label("Successful Pushes:")} ${success(
      results.length - unsuccessful.length + ""
    )}`
  );
  logr.info(`${label("Failed Pushes:")} ${fail(unsuccessful.length + "")}`);
  if (unsuccessful.length === 0) {
    return;
  }
  logger.error("-".repeat(60));
  logger.error(fail("Error Summary"));
  logger.error("-".repeat(60));
  unsuccessful.forEach(({ message }, index) => {
    if (unsuccessful.length === 1) {
      logr.error(message);
    }
    logr.error(`${index + 1}. ${message}`);
  });
};

export const logBuildResults = (results: Sinc.BuildResult[]): void => {
  const unsuccessful = results.filter(r => !r.success);
  const logr = logger.getInternalLogger();
  const label = (content: string) => chalk.bold.blue(content);
  const success = (content: string) => chalk.bold.green(content);
  const fail = (content: string) => chalk.bold.red(content);
  logr.info(`${label("Total Records:")} ${results.length}`);
  logr.info(
    `${label("Successful Builds:")} ${success(
      results.length - unsuccessful.length + ""
    )}`
  );
  logr.info(`${label("Failed Builds:")} ${fail(unsuccessful.length + "")}`);
  if (unsuccessful.length === 0) {
    return;
  }
  logger.error("-".repeat(60));
  logger.error(fail("Error Summary"));
  logger.error("-".repeat(60));
  unsuccessful.forEach(({ message }, index) => {
    if (unsuccessful.length === 1) {
      logr.error(message);
    }
    logr.error(`${index + 1}. ${message}`);
  });
};
