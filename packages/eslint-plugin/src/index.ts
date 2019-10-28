import { Sinc } from "@sincronia/types";
import eslint from "eslint";

const CLIEngine = eslint.CLIEngine;

const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  try {
    let output = content;
    const cli = new CLIEngine({});

    const report = cli.executeOnFiles([context.filePath]);
    const formatter = cli.getFormatter();
    console.log(formatter(report.results));

    let isSuccess = report.errorCount === 0;
    if (!isSuccess) {
      throw new Error("ESLint errors in the code");
    }
    return {
      success: isSuccess,
      output
    };
  } catch (e) {
    throw e;
  }
};

export { run };
