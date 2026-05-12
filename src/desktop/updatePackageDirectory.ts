import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  defaultUpdateArtifactRetentionCount,
  shouldRetainVersion
} from './updateTransaction.js';

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

type PruneUpdatePackageArtifactsOptions = {
  keepVersions?: number;
  preservePaths?: string[];
};

const updatePackageFolderName = '快捷翻译更新包';

export function getDefaultUpdatePackageDirectory(downloadsDirectory: string) {
  return path.join(downloadsDirectory, updatePackageFolderName);
}

export function normalizeUpdatePackageDirectoryPath(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function isUpdatePackageArtifact(fileName: string) {
  return getUpdatePackageArtifactVersion(fileName) !== null;
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

export async function pruneUpdatePackageArtifacts(
  directory: string,
  options: PruneUpdatePackageArtifactsOptions = {},
  dependencies: ClearUpdatePackageDependencies = { mkdir, readdir, rm }
): Promise<ClearUpdatePackageResult> {
  const targetDirectory = directory.trim();
  if (!targetDirectory) {
    throw new Error('更新包目录不能为空');
  }

  await dependencies.mkdir(targetDirectory, { recursive: true });
  const entries = await dependencies.readdir(targetDirectory, { withFileTypes: true });
  const artifacts = entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      name: entry.name,
      version: getUpdatePackageArtifactVersion(entry.name)
    }))
    .filter((entry): entry is { name: string; version: string } => entry.version !== null);

  const preservedVersions = new Set(
    (options.preservePaths ?? [])
      .map((preservePath) => getUpdatePackageArtifactVersion(path.basename(preservePath)))
      .filter((version): version is string => version !== null)
  );
  const retainedVersions = new Set(
    [...new Set(artifacts.map((artifact) => artifact.version))]
      .sort(compareUpdatePackageVersionsDescending)
      .slice(0, options.keepVersions ?? defaultUpdateArtifactRetentionCount)
  );
  let deletedCount = 0;

  for (const artifact of artifacts) {
    if (shouldRetainVersion(artifact.version, retainedVersions, preservedVersions)) {
      continue;
    }

    await dependencies.rm(path.join(targetDirectory, artifact.name), { force: true });
    deletedCount += 1;
  }

  return {
    directory: targetDirectory,
    deletedCount
  };
}

function getUpdatePackageArtifactVersion(fileName: string) {
  const match = /^Quick-Translate-(?:Android-)?(.+?)(?:\.(?:exe|apk|dmg|pkg|ipa)|\.exe\.blockmap)$/i.exec(fileName);
  return match?.[1] ?? null;
}

function compareUpdatePackageVersionsDescending(left: string, right: string) {
  const leftParts = left.split(/[.-]/);
  const rightParts = right.split(/[.-]/);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? '';
    const rightPart = rightParts[index] ?? '';
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : undefined;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : undefined;

    if (leftNumber !== undefined && rightNumber !== undefined && leftNumber !== rightNumber) {
      return rightNumber - leftNumber;
    }

    if (leftPart !== rightPart) {
      return rightPart.localeCompare(leftPart);
    }
  }

  return 0;
}
