import { Sinc } from "@sincronia/types";
import prettier from "prettier";
const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  try {
    let output = "";
    let prettierConfig = await prettier.resolveConfig(context.filePath);
    let opts: prettier.Options = { filepath: context.filePath };
    if (prettierConfig) {
      opts = Object.assign(opts, prettierConfig);
    }
    opts = Object.assign(opts, options);
    if (content) {
      output = await prettier.format(content, opts);
    }
    return {
      success: true,
      output
    };
  } catch (e) {
    throw e;
  }
};

export { run };
