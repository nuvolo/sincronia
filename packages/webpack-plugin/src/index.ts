import { Sinc } from "@sincronia/types";
import memoryFS from "memory-fs";
import webpack from "webpack";
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
  if (options.webpackConfig) {
    Object.assign(wpOptions, options.webpackConfig);
  }
  if (options.configGenerator) {
    wpOptions = Object.assign(wpOptions, options.configGenerator(context));
  }
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
      //console.log(test);
      resolve(memFS.readFileSync("/bundle.js", "utf-8"));
    });
  });
  try {
    let output = await compilePromise;
    //console.log(output);
    return {
      output,
      success: true
    };
  } catch (e) {
    throw new Error();
  }
};

export { run };
