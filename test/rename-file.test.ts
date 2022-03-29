import { renameFile } from '../src/utils/rename-file';
import * as fs from 'fs';
import mockFS from 'mock-fs';
import { URI } from '../src/core/model/uri';

const doesFileExist = (path: string) =>
  fs.promises
    .access(path)
    .then(() => true)
    .catch(() => false);

describe('renameFile', () => {
  const fileUri = URI.file('/test/oldFileName.md');

  beforeAll(() => {
    mockFS({ [fileUri.toFsPath()]: '' });
  });

  afterAll(() => {
    mockFS.restore();
  });

  it('should rename existing file', async () => {
    expect(await doesFileExist(fileUri.toFsPath())).toBe(true);

    renameFile(fileUri, 'new-file-name');

    expect(await doesFileExist(fileUri.toFsPath())).toBe(false);
    expect(await doesFileExist('/test/new-file-name.md')).toBe(true);
  });
});
