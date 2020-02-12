import winston, { format, transports } from "winston";
import chalk from "chalk";

class SincLogger {
  private logger: winston.Logger;
  constructor() {
    this.logger = winston.createLogger(this.genLoggerOpts());
  }
  setLogLevel(level: string) {
    this.logger = winston.createLogger(this.genLoggerOpts(level));
  }

  getLogLevel() {
    return this.logger.level;
  }

  private genLoggerOpts(level: string = "info"): winston.LoggerOptions {
    return {
      format: format.printf(info => {
        return `${info.message}`;
      }),
      level,
      transports: [new transports.Console()]
    };
  }

  info(text: string) {
    this.logger.info(chalk.blue(text));
  }

  error(text: string) {
    this.logger.error(chalk.red(text));
  }

  warn(text: string) {
    this.logger.warn(chalk.yellow(text));
  }

  success(text: string) {
    this.logger.info(chalk.green(text));
  }

  verbose(text: string) {
    this.logger.verbose(text);
  }

  debug(text: string) {
    this.logger.debug(text);
  }

  silly(text: string) {
    this.logger.silly(text);
  }

  getInternalLogger() {
    return this.logger;
  }
}
const loggerInst = new SincLogger();
export { loggerInst as logger };
