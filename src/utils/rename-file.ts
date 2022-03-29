import * as fs from 'fs';
import * as path from 'path';
import { URI } from '../core/model/uri';

/**
 *
 * @param fileUri absolute path for the file that needs to renamed
 * @param newFileName  "new file name" without the extension
 */
export const renameFile = async (fileUri: URI, newFileName: string) => {
  const filePath = fileUri.toFsPath();
  const dirName = path.dirname(filePath);
  const extension = path.extname(filePath);
  const newFileUri = path.join(dirName, `${newFileName}${extension}`);

  return fs.promises.rename(filePath, newFileUri);
};
