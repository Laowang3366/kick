import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function getWindowsHelperTempDirectory() {
  const localDataRoot =
    process.env.LOCALAPPDATA ||
    (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : undefined);
  const tempDirectory = localDataRoot
    ? path.join(localDataRoot, 'QuickTranslate', 'Temp')
    : path.join(tmpdir(), 'quick-translate-temp');

  mkdirSync(tempDirectory, { recursive: true });
  return tempDirectory;
}

export function createWindowsHelperEnvironment() {
  const tempDirectory = getWindowsHelperTempDirectory();

  return {
    ...process.env,
    TEMP: tempDirectory,
    TMP: tempDirectory
  };
}
