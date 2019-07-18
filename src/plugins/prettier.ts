import prettier from "prettier";
const run: SNCDPluginFunc = function(
  context: SNCDFileContext,
  content: string,
  options: any
): SNCDPluginResults {
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
