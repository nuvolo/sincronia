import * as babel from "@babel/core";
import sanitizePlugin from "./sanitizer";
export async function run(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  try {
    let output = "";
    let res = await babel.transformAsync(content, {
      plugins: [sanitizePlugin]
    });
    if (res && res.code) {
      output = res.code;
    } else {
      return {
        output: "",
        success: false
      };
    }
    return {
      output,
      success: true
    };
  } catch (e) {
    throw e;
  }
}
