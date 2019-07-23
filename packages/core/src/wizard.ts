import inquirer from "inquirer";
import { ServiceNowConnection } from "./server";

export async function startWizard() {
  let loginAnswers = await getLoginInfo();
  let selectedApp = await showAppList(loginAnswers);
  if (!selectedApp) {
    return;
  }
  console.log(selectedApp);
}

async function getLoginInfo(): Promise<Sinc.LoginAnswers> {
  return await inquirer.prompt([
    {
      type: "input",
      name: "instance",
      message:
        "What instance would you like to connect to?(ex. test123.service-now.com)"
    },
    {
      type: "input",
      name: "username",
      message: "What is your username on that instance?"
    },
    {
      type: "password",
      name: "password",
      message: "What is your username on that instance?"
    }
  ]);
}

async function showAppList(
  answers: Sinc.LoginAnswers
): Promise<string | undefined> {
  let snc = new ServiceNowConnection(
    answers.instance,
    answers.username,
    answers.password
  );
  let apps: SN.App[] = [];
  try {
    apps = await snc.getAppList();
  } catch (e) {
    console.error(
      "Failed to get application list. Check to see that your credentials are correct and you have the update set installed on your instance."
    );
    return;
  }
  let appSelection: Sinc.AppSelectionAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "app",
      message: "Which app would you like to work with?",
      choices: apps.map(app => {
        return {
          name: `${app.displayName}(${app.scope})`,
          value: app.scope,
          short: app.displayName
        };
      })
    }
  ]);
  return appSelection.app;
}
