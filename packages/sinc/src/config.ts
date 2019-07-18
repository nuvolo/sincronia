import path from "path";
import fs from "fs";
const fsp = fs.promises;

const CONFIG_FILE = path.join(process.cwd(), "config.json");

function _getConfig(): Promise<SNCDConfig | undefined> {
  return new Promise((resolve, reject) => {
    fsp
      .readFile(CONFIG_FILE, "utf-8")
      .then(data => {
        resolve(JSON.parse(data));
      })
      .catch(e => {
        console.error(
          "There was a problem parsing the config file",
          CONFIG_FILE
        );
        reject(e);
      });
  });
}

const config: Promise<SNCDConfig | undefined> = _getConfig();

export { config };
