import prettier from "prettier";
const run: Sinc.PluginFunc = function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Sinc.PluginResults {
  let output = "";
  if (content) {
    output = prettier.format(content, { parser: "babel" });
  }
  return {
    success: true,
    output
  };
};

export { run };
