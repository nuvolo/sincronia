import { config } from "./config";
import fs from "fs";
const fsp = fs.promises;

async function _no_config(filePath: string) {
  return await fsp.readFile(filePath, "utf-8");
}

async function readFile(context: SNCDFileContext): Promise<string> {
  const { filePath } = context;

  try {
    const contents = await fsp.readFile(filePath, "utf-8");
    let pm = new PluginManager();
    await pm.loadPluginConfig();
    return await pm.processFile(context, contents);
  } catch (e) {
    throw e;
  }
}

class PluginManager {
  pluginRules: SNCDPluginRule[];
  constructor() {
    this.pluginRules = [];
  }

  async loadPluginConfig() {
    //TODO: Cache the plugin configuration
    let conf = await config;
    if (conf && conf.rules) {
      this.pluginRules = conf.rules;
    } else {
      console.log("No rules detected!");
    }
  }

  determinePlugins(context: SNCDFileContext): SNCDPluginConfig[] {
    let plugins: SNCDPluginConfig[] = [];
    for (let rule of this.pluginRules) {
      let reg = new RegExp(rule.match);
      if (reg.test(context.filePath)) {
        plugins = rule.plugins;
      }
    }
    return plugins;
  }

  async runPlugins(
    plugins: SNCDPluginConfig[],
    context: SNCDFileContext,
    content: string
  ): Promise<SNCDTransformResults> {
    try {
      let output = content;
      for (let pConfig of plugins) {
        let plugin: SNCDPlugin = await import("./plugins/" + pConfig.name);
        let results = await plugin.run(context, output, pConfig.options);
        if (!results.success) {
          return {
            success: false,
            content: ""
          };
        }
        output = results.output;
      }
      return {
        success: true,
        content: output
      };
    } catch (e) {
      throw e;
    }
  }

  async processFile(
    context: SNCDFileContext,
    content: string
  ): Promise<string> {
    let plugins = this.determinePlugins(context);
    if (plugins.length > 0) {
      let pluginResults = await this.runPlugins(plugins, context, content);
      if (pluginResults.success) {
        return pluginResults.content;
      } else {
        return "";
      }
    } else {
      return content;
    }
  }
}

export { readFile, PluginManager };
