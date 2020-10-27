import * as cp from "child_process";
import path from "path";
import { logger } from "./Logger";
import { PATH_DELIMITER } from "./constants";
import ConfigManager from "./config";
import fs from "fs";
import * as fUtils from "./FileUtils";

export const gitDiffToEncodedPaths = async (diff: string) => {
  if (diff !== "") return gitDiff(diff);
  return ConfigManager.getSourcePath();
};

const gitDiff = async (target: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const cmdStr = `git diff --name-status ${target}...`;
    cp.exec(cmdStr, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(formatGitFiles(stdout.trim()));
      }
    });
  });
};

export const writeDiff = async (files: string) => {
  let paths = await fUtils.encodedPathsToFilePaths(files);
  logger.silly(`${paths.length} paths found...`);
  logger.silly(JSON.stringify(paths, null, 2));
  fs.promises.writeFile(
    ConfigManager.getDiffPath(),
    JSON.stringify({ changed: paths })
  );
};

const formatGitFiles = async (gitFiles: string) => {
  const baseRepoPath = await getRepoRootDir();
  const workspaceDir = process.cwd();
  const fileSplit = gitFiles.split(/\r?\n/);
  const fileArray: string[] = [];
  fileSplit.forEach(diffFile => {
    if (diffFile !== "") {
      const modCode = diffFile.charAt(0);

      if (modCode !== "D") {
        const filePath = diffFile.substr(1, diffFile.length - 1).trim();

        if (isValidScope(filePath, workspaceDir, baseRepoPath)) {
          logger.info(diffFile);
          const absFilePath = path.resolve(baseRepoPath, filePath);
          fileArray.push(absFilePath);
        }
      }
    }
  });
  return fileArray.join(PATH_DELIMITER);
};

const getRepoRootDir = async (): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    cp.exec("git rev-parse --show-toplevel", (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

const isValidScope = (
  file: string,
  scope: string,
  baseRepoPath: string
): boolean => {
  const relativePath = path.relative(baseRepoPath, scope);
  return file.startsWith(relativePath) ? true : false;
};
