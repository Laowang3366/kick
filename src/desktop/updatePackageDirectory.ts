import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

export type ClearUpdatePackageResult = {
  directory: string;
  deletedCount: number;
};

type DirectoryEntryLike = {
  name: string;
  isFile(): boolean;
};

type ClearUpdatePackageDependencies = {
  mkdir: typeof mkdir;
  readdir: (directory: string, options: { withFileTypes: true }) => Promise<DirectoryEntryLike[]>;
  rm: typeof rm;
};

const updatePackageFolderName = '快捷翻译更新包';

export function getDefaultUpdatePackageDirectory(downloadsDirectory: string) {
  return path.join(downloadsDirectory, updatePackageFolderName);
}

export function normalizeUpdatePackageDirectoryPath(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function isUpdatePackageArtifact(fileName: string) {
  return /^Quick-Translate-(?:Android-)?\d+\.\d+\.\d+(?:\.(?:exe|apk|dmg|pkg|ipa)|\.exe\.blockmap)$/i.test(fileName);
}

export async function clearUpdatePackageArtifacts(
  directory: string,
  dependencies: ClearUpdatePackageDependencies = { mkdir, readdir, rm }
): Promise<ClearUpdatePackageResult> {
  const targetDirectory = directory.trim();
  if (!targetDirectory) {
    throw new Error('更新包目录不能为空');
  }

  await dependencies.mkdir(targetDirectory, { recursive: true });
  const entries = await dependencies.readdir(targetDirectory, { withFileTypes: true });
  let deletedCount = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !isUpdatePackageArtifact(entry.name)) {
      continue;
    }

    await dependencies.rm(path.join(targetDirectory, entry.name), { force: true });
    deletedCount += 1;
  }

  return {
    directory: targetDirectory,
    deletedCount
  };
}
