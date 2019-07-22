import * as ts from "typescript";

const run: Sinc.PluginFunc = function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Sinc.PluginResults {
  let output = ts.transpileModule(content, {}).outputText;
  return {
    success: true,
    output
  };
};

export { run };
