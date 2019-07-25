import * as ts from "typescript";
import fs from "fs";
const fsp = fs.promises;
import path from "path";
import stripJsonComments from "strip-json-comments";
const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  try {
    //try to load tsconifg.json
    let output = "";
    let configPath = ts.findConfigFile(
      context.filePath,
      ts.sys.fileExists,
      "tsconfig.json"
    );
    let configObj: ts.TranspileOptions = {};
    if (configPath) {
      let configText = await fsp.readFile(configPath, { encoding: "utf-8" });
      configObj = JSON.parse(stripJsonComments(configText));
    }
    configObj = Object.assign(configObj, options);
    output = ts.transpileModule(content, configObj).outputText;
    return {
      success: true,
      output
    };
  } catch (e) {
    throw e;
  }
};

export { run };
