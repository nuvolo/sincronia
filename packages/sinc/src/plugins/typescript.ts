import * as ts from "typescript";

const run: SNCDPluginFunc = function(
  context: SNCDFileContext,
  content: string,
  options: any
): SNCDPluginResults {
  let output = ts.transpileModule(content, {}).outputText;
  return {
    success: true,
    output
  };
};

export { run };
