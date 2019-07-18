import fs from "fs";
import path from "path";
import { config } from "./config";
import Manifest from "./Manifest";
import { getParsedFilesPayload } from "./fileUtil"

const fsp = fs.promises;

async function loaddir(dirPath: string, list: string[]) {
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
}

async function _parseFileParams(files: string[]){
  return await getParsedFilesPayload(files);
}

async function loadList(startingDir: string):Promise<string[]>{
  let list: string[] = [];
  const { sourceDirectory = 'src' } = await config || {};
  let subDirectory = path.join(startingDir, sourceDirectory);
  await loaddir(subDirectory, list);
  return list;
}

export async function crawl(startingDir: string) {
  const files = await loadList(startingDir);
  return _parseFileParams(files);
}
