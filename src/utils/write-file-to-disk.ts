import * as fs from 'fs';
import { URI } from '../core/model/uri';

export const writeFileToDisk = async (fileUri: URI, data: string) => {
  return fs.promises.writeFile(fileUri.toFsPath(), data);
};
