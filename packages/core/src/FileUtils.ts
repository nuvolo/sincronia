import { SN } from "@sincronia/types";
import fs, { promises as fsp } from "fs";
import path from "path";

export const SNFileExists = (parentDirPath: string) => async (
  file: SN.File
): Promise<boolean> => {
  try {
    const files = await fsp.readdir(parentDirPath);
    const reg = new RegExp(`${file.name}\\.*$`);
    return !!files.find(reg.test);
  } catch (e) {
    return false;
  }
};

const writeSNFileCurry = (checkExists: boolean) => async (
  file: SN.File,
  parentPath: string
): Promise<void> => {
  const { name, type, content = "" } = file;
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

export const createDirRecursively = async (path: string) => {
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

export const appendToPath = (prefix: string) => (suffix: string) =>
  path.join(prefix, suffix);

export const writeSNFileIfNotExists = writeSNFileCurry(true);
export const writeSNFileForce = writeSNFileCurry(false);

export const writeFileForce = fsp.writeFile;
