import { Sinc } from "@sincronia/types";
import { ESLint } from "eslint";

const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
): Promise<Sinc.PluginResults> {
  try {
    const output = content;
    const linter = new ESLint({});
    const results = await linter.lintFiles([context.filePath]);
    const formatter = await linter.loadFormatter();
    
    const format_result = formatter.format(results);
    const format_result_string = typeof format_result === 'string'? format_result: await format_result;
    console.log(format_result_string);

    const  isSuccess = results.every((r) => r.errorCount === 0 );
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