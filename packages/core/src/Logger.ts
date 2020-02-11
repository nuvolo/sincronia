import winston, { format, transports } from "winston";
import chalk from "chalk";

const defaultOpts: winston.LoggerOptions = {
  format: format.printf(info => {
    return `${info.message}`;
  }),
  transports: [new transports.Console()]
};

class SincLogger {
  logger: winston.Logger;
  constructor() {
    this.logger = winston.createLogger(defaultOpts);
  }
  setLogLevel(level: string) {
    this.logger = winston.createLogger({
      ...defaultOpts,
      level
    });
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

  getLogger() {
    return this.logger;
  }
}
const loggerInst = new SincLogger();
export { loggerInst as logger };
