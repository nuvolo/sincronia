import { SN, Sinc } from "@sincronia/types";
import inquirer from "inquirer";
import * as ConfigManager from "./config";
import * as AppUtils from "./appUtils";
import fs from "fs";
const fsp = fs.promises;
import { logger } from "./Logger";
import path from "path";
import { snClient, unwrapSNResponse, defaultClient } from "./snClient";

export async function startWizard() {
  let loginAnswers = await getLoginInfo();
  try {
    let { username, password, instance } = loginAnswers;
    const client = snClient(`https://${instance}/`, username, password);
    const apps = await unwrapSNResponse(client.getAppList());
    await setupDotEnv(loginAnswers);
    let hasConfig = await checkConfig();
    if (!hasConfig) {
      logger.info("Generating config...");
      await writeDefaultConfig(hasConfig);
    }
    let man = ConfigManager.getManifest(true);
    if (!man) {
      let selectedApp = await showAppList(apps);
      if (!selectedApp) {
        return;
      }
      logger.info("Downloading app...");
      await downloadApp(loginAnswers, selectedApp);
    }
    logger.success(
      "You are all set up 👍 Try running 'npx sinc dev' to begin development mode."
    );
    await ConfigManager.loadConfigs();
  } catch (e) {
    logger.error(
      "Failed to setup application. Check to see that your credentials are correct and you have the update set installed on your instance."
    );
    return;
  }
}

async function getLoginInfo(): Promise<Sinc.LoginAnswers> {
  return await inquirer.prompt([
    {
      type: "input",
      name: "instance",
      message:
        "What instance would you like to connect to?(ex. test123.service-now.com)",
    },
    {
      type: "input",
      name: "username",
      message: "What is your username on that instance?",
    },
    {
      type: "password",
      name: "password",
      message: "What is your password on that instance?",
    },
  ]);
}

async function checkConfig(): Promise<boolean> {
  try {
    let checkConfig = ConfigManager.checkConfigPath();
    if (!checkConfig) {
      return false;
    }
    await fsp.access(checkConfig, fs.constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

async function setupDotEnv(answers: Sinc.LoginAnswers) {
  let data = `SN_USER=${answers.username}
SN_PASSWORD=${answers.password}
SN_INSTANCE=${answers.instance}
  `;
  process.env.SN_USER = answers.username;
  process.env.SN_PASSWORD = answers.password;
  process.env.SN_INSTANCE = answers.instance;
  try {
    await fsp.writeFile(ConfigManager.getEnvPath(), data);
  } catch (e) {
    throw e;
  }
}

async function writeDefaultConfig(hasConfig: boolean) {
  try {
    let pth;
    if (hasConfig) pth = ConfigManager.getConfigPath();
    else pth = path.join(process.cwd(), "sinc.config.js");
    if (pth) {
      await fsp.writeFile(pth, ConfigManager.getDefaultConfigFile());
    }
  } catch (e) {
    throw e;
  }
}

async function showAppList(apps: SN.App[]): Promise<string | undefined> {
  let appSelection: Sinc.AppSelectionAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "app",
      message: "Which app would you like to work with?",
      choices: apps.map((app) => {
        return {
          name: `${app.displayName}(${app.scope})`,
          value: app.scope,
          short: app.displayName,
        };
      }),
    },
  ]);
  return appSelection.app;
}

async function downloadApp(answers: Sinc.LoginAnswers, scope: string) {
  try {
    const client = defaultClient();
    const config = ConfigManager.getConfig();
    const man:any = await unwrapSNResponse(client.getManifest(scope, config, true));
    await AppUtils.processManifest(man);
  } catch (e) {
    let message
    if (e instanceof Error) message = e.message
    else message = String(e)
    logger.error(message);
    throw new Error("Failed to download files!");
  }
}
