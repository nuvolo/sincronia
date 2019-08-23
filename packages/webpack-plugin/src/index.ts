import { Sinc } from "@sincronia/types";
import memoryFS from "memory-fs";
import webpack from "webpack";
import path from "path";
interface webpackPluginOpts {
  configGenerator?: (context: Sinc.FileContext) => webpack.Configuration;
  webpackConfig?: webpack.Configuration;
}
const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
  options: webpackPluginOpts
): Promise<Sinc.PluginResults> {
  const memFS = new memoryFS();
  let wpOptions: webpack.Configuration = {};
  let configFile = await loadWebpackConfig();
  //First, try to load configuration file
  if (configFile) {
    Object.assign(wpOptions, configFile);
  }
  //Second, load from the options
  if (options.webpackConfig) {
    Object.assign(wpOptions, options.webpackConfig);
  }
  //Third, load from configGenerator function
  if (options.configGenerator) {
    wpOptions = Object.assign(wpOptions, options.configGenerator(context));
  }
  //override necesary parameters
  wpOptions.entry = context.filePath;
  wpOptions.output = {
    path: "/",
    filename: "bundle.js"
  };
  let compiler = webpack(wpOptions);
  compiler.outputFileSystem = memFS;
  let compilePromise = new Promise<string>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(memFS.readFileSync("/bundle.js", "utf-8"));
    });
  });
  try {
    let output = await compilePromise;
    return {
      output,
      success: true
    };
  } catch (e) {
    throw new Error();
  }
  function getWebpackConfigPath() {
    let pathChunks = context.filePath.split(path.sep);
    pathChunks.pop();
    pathChunks.push("webpack.config.js");
    return path.sep + path.join(...pathChunks);
  }
  async function loadWebpackConfig() {
    try {
      let configPath = getWebpackConfigPath();
      let config: webpack.Configuration = (await import(configPath)).default;
      return config;
    } catch (e) {
      return false;
    }
  }
};

export { run };
