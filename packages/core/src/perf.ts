import ConfigManager from "./config";
import AppManager from "./AppManager";
import * as AppMan2 from "./appUtils";
import dotenv from "dotenv";
// @ts-ignore
// import * as testManifest from "./testManifest.json";
import { isUnderPath } from "./FileUtils";
import { retryOnErr } from "./snClient";

const t = async (name: string, action: () => Promise<void>) => {
  console.info(name);
  const start = new Date();
  await action();
  const end = new Date();
  console.info(`took ${end.getTime() - start.getTime()} ms `);
};
const main = async () => {
  await ConfigManager.loadConfigs();
  const path = ConfigManager.getEnvPath();
  dotenv.config({
    path
  });
  // await t("original manifest process", async () => {
  //   return AppManager.processManifest(testManifest);
  // });
  // await t("new manifest process", async () => {
  //   return AppMan2.processManifest(testManifest);
  // });
  // await t("old reconcile", async () => {
  //   const res = await AppManager.determineMissing(testManifest);
  //   console.info(res);
  // });
  // await t("new reconcile", async () => {
  //   const res = await AppMan2.findMissingFiles(testManifest);
  //   console.info(res);
  // });
  // await t("appFilesInPath", async () => {
  //   const res = await AppMan2.getAppFilesInPath(ConfigManager.getSourcePath());
  //   console.info(AppMan2.groupAppFiles(res));
  // });
  // await t("pushing test", async () => {
  //   try {
  //     await AppMan2.pushFiles(ConfigManager.getSourcePath());
  //   } catch (e) {
  //     console.info(e);
  //   }
  // });
  // await t("retry test", async () => {
  //   const failOnX = (numTimes: number) => {
  //     let x = numTimes;
  //     const fail = async () => {
  //       if (x === 0) {
  //         return "TEST";
  //       }
  //       x--;
  //       throw new Error("FAILURE");
  //     };
  //     return fail;
  //   };

  //   const res = await retryOnFail(failOnX(2), 2, 50);
  //   console.info(res);
  // });
};

main();
