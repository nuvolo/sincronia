import * as babel from "@babel/core";
export async function run(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  try {
    let output = "";
    options = Object.assign(options, {
      filename: `${context.targetField}${context.ext}`
    });
    let res = await babel.transformAsync(content, options || {});
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
