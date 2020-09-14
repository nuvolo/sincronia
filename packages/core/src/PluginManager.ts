import { Sinc } from "@sincronia/types";
import ConfigManager from "./config";
import fs from "fs";
import path from "path";
const fsp = fs.promises;

class PluginManager {
  pluginRules: Sinc.PluginRule[];
  constructor() {
    this.pluginRules = [];
  }

  async loadPluginConfig() {
    let conf = ConfigManager.getConfig();
    if (conf && conf.rules) {
      this.pluginRules = conf.rules;
    }
  }

  determinePlugins(context: Sinc.FileContext): Sinc.PluginConfig[] {
    let plugins: Sinc.PluginConfig[] = [];
    for (let rule of this.pluginRules) {
      let reg = rule.match;
      if (reg.test(context.filePath)) {
        plugins = rule.plugins;
        //only match first rule
        break;
      }
    }
    return plugins;
  }

  async runPlugins(
    plugins: Sinc.PluginConfig[],
    context: Sinc.FileContext,
    content: string
  ): Promise<Sinc.TransformResults> {
    try {
      let output = content;
      for (let pConfig of plugins) {
        let pluginPath = path.join(
          ConfigManager.getRootDir(),
          "node_modules",
          pConfig.name
        );
        let plugin: Sinc.Plugin = await import(pluginPath);
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
    context: Sinc.FileContext,
    content: string
  ): Promise<string> {
    let plugins = this.determinePlugins(context);
    if (plugins.length > 0) {
      try {
        let pluginResults = await this.runPlugins(plugins, context, content);
        if (pluginResults.success) {
          return pluginResults.content;
        } else {
          return "";
        }
      } catch (e) {
        throw e;
      }
    } else {
      return content;
    }
  }

  async getFinalFileContents(context: Sinc.FileContext, processFile = true) {
    const { filePath } = context;
    try {
      const contents = await fsp.readFile(filePath, "utf-8");
      if (processFile) {
        await this.loadPluginConfig();
        return await this.processFile(context, contents);
      }
      return contents;
    } catch (e) {
      throw e;
    }
  }
}

export default new PluginManager();
