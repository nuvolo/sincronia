import prettier from "prettier";
import "@sincronia/types";
const run: Sinc.PluginFunc = function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Sinc.PluginResults {
  try {
    let output = "";
    if (content) {
      output = prettier.format(content, { parser: "babel" });
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
