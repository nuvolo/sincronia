import { Sinc } from "@sincronia/types";
import * as ts from "typescript";
const run: Sinc.PluginFunc = async function(
  context: Sinc.FileContext,
  content: string,
  options: any
): Promise<Sinc.PluginResults> {
  interface TSPluginOptions {
    compilerOptions?: ts.CompilerOptions;
    transpile?: boolean;
  }
  let pluginOpts = options as TSPluginOptions;
  try {
    //try to load tsconifg.json
    let output = "";
    let configPath = ts.findConfigFile(
      context.filePath,
      ts.sys.fileExists,
      "tsconfig.json"
    );

    let tsConfig: { compilerOptions: ts.CompilerOptions };
    if (configPath) {
      let results = ts.readConfigFile(configPath, ts.sys.readFile);
      if (results.config) {
        tsConfig = results.config;
      } else {
        tsConfig = {
          compilerOptions: {}
        };
      }
    } else {
      tsConfig = {
        compilerOptions: {}
      };
    }
    tsConfig.compilerOptions.rootDir = undefined;
    tsConfig.compilerOptions.moduleResolution = ts.ModuleResolutionKind.NodeJs;
    tsConfig.compilerOptions.lib = tsConfig.compilerOptions.lib
      ? tsConfig.compilerOptions.lib.map(cur => `lib.${cur}.d.ts`)
      : undefined;
    //check the types, if we get errors, throw an error
    let diagnostics = typeCheck(
      [context.filePath],
      tsConfig.compilerOptions || {}
    );
    if (diagnostics.length > 0) {
      let diagnosticSummary = processDiagnostics(diagnostics);
      throw new Error(diagnosticSummary);
    }
    //no errors so we are good to transpile
    //Default to transpile. Can be disabled so we can transpile elsewhere...
    if (
      !pluginOpts.hasOwnProperty("transpile") ||
      pluginOpts.transpile === true
    ) {
      tsConfig.compilerOptions = Object.assign(
        tsConfig.compilerOptions,
        pluginOpts.compilerOptions
      );
      output = ts.transpileModule(content, {
        compilerOptions: tsConfig.compilerOptions
      }).outputText;
      return {
        success: true,
        output
      };
    } else {
      //no transpilation, going to be handled somewhere else
      return {
        success: true,
        output: content
      };
    }

    function typeCheck(fileNames: string[], options: ts.CompilerOptions) {
      //don't want to output files
      options.noEmit = true;
      let program = ts.createProgram(fileNames, options);
      let emitResult = program.emit();
      let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
      return allDiagnostics;
    }

    function processDiagnostics(diagnostics: ts.Diagnostic[]) {
      return diagnostics
        .map(diagnostic => {
          if (diagnostic.file) {
            let {
              line,
              character
            } = diagnostic.file.getLineAndCharacterOfPosition(
              diagnostic.start!
            );
            let message = ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              "\n"
            );
            return `${diagnostic.file.fileName} (${line + 1},${character +
              1}): ${message}`;
          } else {
            return ts.flattenDiagnosticMessageText(
              diagnostic.messageText,
              "\n"
            );
          }
        })
        .join("\n");
    }
  } catch (e) {
    throw e;
  }
};

export { run };
