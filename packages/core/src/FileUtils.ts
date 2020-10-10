import { SN, Sinc } from "@sincronia/types";
import { PATH_DELIMITER } from "./constants";
import fs, { promises as fsp } from "fs";
import path from "path";
import AppManager from "./AppManager";
import ConfigManager from "./config";

export const SNFileExists = (parentDirPath: string) => async (
  file: SN.File
): Promise<boolean> => {
  try {
    const files = await fsp.readdir(parentDirPath);
    const reg = new RegExp(`${file.name}\..*$`);
    return !!files.find(f => reg.test(f));
  } catch (e) {
    return false;
  }
};

export const writeManifestFile = async (man: SN.AppManifest) => {
  return fsp.writeFile(
    ConfigManager.getManifestPath(),
    JSON.stringify(man, null, 2)
  );
};

export const writeSNFileCurry = (checkExists: boolean) => async (
  file: SN.File,
  parentPath: string
): Promise<void> => {
  const { name, type, content = "" } = file;
  // content can sometimes be null
  if (!content) {
    content === "";
  }
  const write = async () => {
    const fullPath = path.join(parentPath, `${name}.${type}`);
    return await fsp.writeFile(fullPath, content);
  };
  if (checkExists) {
    const exists = await SNFileExists(parentPath)(file);
    if (!exists) {
      await write();
    }
  } else {
    write();
  }
};

export const createDirRecursively = async (path: string): Promise<void> => {
  await fsp.mkdir(path, { recursive: true });
};

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await fsp.access(path, fs.constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

export const getFilePaths = async (pathString: string) => {
  let pathPromises = pathString
    .split(PATH_DELIMITER)
    .filter(cur => {
      //make sure it isn't blank
      if (cur && cur !== "") {
        //make sure it exists
        let resolvedPath = path.resolve(process.cwd(), cur);
        return fs.existsSync(resolvedPath);
      } else {
        return false;
      }
    })
    .map(async cur => {
      let resolvedPath = path.resolve(process.cwd(), cur);
      let stats = await fsp.stat(resolvedPath);
      if (stats.isDirectory()) {
        return await loadList(resolvedPath);
      } else {
        return [resolvedPath];
      }
    });
  let pathArrays = await Promise.all(pathPromises);
  let paths = pathArrays.reduce((acc, cur) => {
    return acc.concat(cur);
  }, []);
  return paths;
};

const loadList = async (directory: string): Promise<string[]> => {
  let list: string[] = [];
  await loaddir(directory, list);
  return list;
};

const loaddir = async (dirPath: string, list: string[]) => {
  try {
    let files = await fsp.readdir(dirPath);
    for (let f of files) {
      let filep = path.join(dirPath, f);
      let stats = await fsp.stat(filep);
      if (stats.isDirectory()) {
        await loaddir(filep, list);
      } else {
        list.push(filep);
      }
    }
  } catch (e) {
    throw e;
  }
};

export const appendToPath = (prefix: string) => (suffix: string): string =>
  path.join(prefix, suffix);

/**
 * Detects if a path is under a parent directory
 * @param parentPath full path to parent directory
 * @param potentialChildPath full path to child directory
 */
export const isUnderPath = (
  parentPath: string,
  potentialChildPath: string
): boolean => {
  const parentTokens = parentPath.split(path.sep);
  const childTokens = potentialChildPath.split(path.sep);
  return parentTokens.every((token, index) => token === childTokens[index]);
};

const getFileExtension = (filePath: string): string => {
  try {
    return (
      "." +
      path
        .basename(filePath)
        .split(".")
        .slice(1)
        .join(".")
    );
  } catch (e) {
    return "";
  }
};

const getTargetFieldFromPath = (
  filePath: string,
  table: string,
  ext: string
): string => {
  return table === "sys_atf_step"
    ? "inputs.script"
    : path.basename(filePath, ext);
};

export const getFileContextFromPath = (
  filePath: string
): Sinc.FileContext | undefined => {
  const ext = getFileExtension(filePath);
  const [tableName, recordName] = path
    .dirname(filePath)
    .split(path.sep)
    .slice(-2);
  const targetField = getTargetFieldFromPath(filePath, tableName, ext);
  const manifest = ConfigManager.getManifest();
  if (!manifest) {
    throw new Error("No manifest has been loaded!");
  }
  const { tables, scope } = manifest;
  try {
    const { records } = tables[tableName];
    const record = records[recordName];
    const { files, sys_id } = record;
    const field = files.find(file => file.name === targetField);
    if (!field) {
      return undefined;
    }
    return {
      filePath,
      ext,
      sys_id,
      name: recordName,
      scope,
      tableName,
      targetField
    };
  } catch (e) {
    return undefined;
  }
};

export const toAbsolutePath = (p: string): string =>
  path.isAbsolute(p) ? p : path.join(process.cwd(), p);

export const isDirectory = async (p: string): Promise<boolean> => {
  const stats = await fsp.stat(p);
  return stats.isDirectory();
};

export const getPathsInPath = async (p: string): Promise<string[]> => {
  if (!isUnderPath(ConfigManager.getSourcePath(), p)) {
    return [];
  }
  const isDir = await isDirectory(p);
  if (!isDir) {
    return [p];
  } else {
    const childPaths = await fsp.readdir(p);
    const pathPromises = childPaths.map(childPath =>
      getPathsInPath(path.resolve(p, childPath))
    );
    const stackedPaths = await Promise.all(pathPromises);
    return stackedPaths.flat();
  }
};

export const summarizeFile = (ctx: Sinc.FileContext): string => {
  const { tableName, name: recordName, sys_id } = ctx;
  return `${tableName}/${recordName}/${sys_id}`;
};

export const writeSNFileIfNotExists = writeSNFileCurry(true);
export const writeSNFileForce = writeSNFileCurry(false);

export const writeFileForce = fsp.writeFile;
