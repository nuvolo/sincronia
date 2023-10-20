import { Sinc } from "@sincronia/types";
import memoryFS from "memory-fs";
import webpack from "webpack";
import path from "path";
interface webpackPluginOpts {
  configGenerator?: (context: Sinc.FileContext) => webpack.Configuration;
  webpackConfig?: webpack.Configuration;
}
const run: Sinc.PluginFunc = async function (
  context: Sinc.FileContext,
  content: string,
  options: webpackPluginOpts
): Promise<Sinc.PluginResults> {
  const memFS = new memoryFS();
  let wpOptions: webpack.Configuration = {};
  const configFile = await loadWebpackConfig();
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
  //override necessary parameters
  wpOptions.entry = context.filePath;
  wpOptions.output = {
    path: "/",
    filename: "bundle.js",
  };
  const compiler = webpack(wpOptions);
  compiler.outputFileSystem = memFS;
  const compilePromise = new Promise<string>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats && stats.hasErrors()) {
        console.error(stats.toString("normal"));
        reject(new Error("Webpack failed to create the bundle."));
        return;
      }
      resolve(memFS.readFileSync("/bundle.js", "utf-8"));
    });
  });
  try {
    const output = await compilePromise;
    return {
      output,
      success: true,
    };
  } catch (e) {
    throw new Error(`${e}`);
  }
  function getWebpackConfigPath() {
    const pathChunks = context.filePath.split(path.sep);
    pathChunks.pop();
    pathChunks.push("webpack.config.js");
    return path.sep + path.join(...pathChunks);
  }
  async function loadWebpackConfig() {
    try {
      const configPath = getWebpackConfigPath();
      const config: webpack.Configuration = (await import(configPath)).default;
      return config;
    } catch (e) {
      return false;
    }
  }
};

export { run };
