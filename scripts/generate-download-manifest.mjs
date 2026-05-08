import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepLatestVersions } from './downloadManifestRetention.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(projectRoot, 'release');
const dataDir = process.env.QUICK_TRANSLATE_DATA_DIR ?? path.join(projectRoot, 'server-data');
const outputPath = path.join(dataDir, 'downloads.json');
const publicUpdateBaseUrl =
  process.env.QUICK_TRANSLATE_UPDATE_BASE_URL ?? 'https://sg.lwvpscc.top/quick-translate/updates/latest';

const latestYmlPath = path.join(releaseDir, 'latest.yml');

if (!existsSync(latestYmlPath)) {
  throw new Error(`未找到 ${latestYmlPath}`);
}

const latestYml = await readFile(latestYmlPath, 'utf8');
const version = readYamlValue(latestYml, 'version');
const fileName = readYamlValue(latestYml, 'path');
const sha512 = readYamlValue(latestYml, 'sha512');
const releaseDate = readYamlValue(latestYml, 'releaseDate').replace(/^['"]|['"]$/g, '');
const filePath = path.join(releaseDir, fileName);
const fileStat = await stat(filePath);
const release = {
  version,
  platform: inferPlatform(fileName),
  fileName,
  url: `${publicUpdateBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(fileName)}`,
  size: fileStat.size,
  sha512,
  releaseDate
};
const additionalReleases = await collectAdditionalReleases({
  releaseDir,
  version,
  skipFileNames: new Set([fileName, `${fileName}.blockmap`, 'latest.yml']),
  publicUpdateBaseUrl
});

const existingManifest = await readExistingManifest(outputPath);
const newReleases = [release, ...additionalReleases];
const newReleaseKeys = new Set(newReleases.map(releaseKey));
const replacedReleaseTargets = new Set(newReleases.map(releaseTargetKey));
const releases = keepLatestVersions([
  ...newReleases,
  ...existingManifest.releases.filter(
    (item) => !newReleaseKeys.has(releaseKey(item)) && !replacedReleaseTargets.has(releaseTargetKey(item))
  )
], 2);

await mkdir(dataDir, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      latestVersion: releases[0]?.version ?? version,
      releases
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log(`[下载清单] 已写入 ${outputPath}`);

function readYamlValue(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) {
    throw new Error(`latest.yml 缺少 ${key}`);
  }

  return match[1].trim();
}

function inferPlatform(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.dmg') || normalized.includes('mac')) {
    return 'macos';
  }
  if (normalized.endsWith('.apk') || normalized.endsWith('.aab') || normalized.includes('android')) {
    return 'android';
  }
  if (normalized.endsWith('.ipa') || normalized.includes('ios')) {
    return 'ios';
  }
  return 'windows';
}

async function readExistingManifest(filePath) {
  if (!existsSync(filePath)) {
    return { releases: [] };
  }

  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    return {
      releases: Array.isArray(parsed.releases) ? parsed.releases : []
    };
  } catch {
    return { releases: [] };
  }
}

async function collectAdditionalReleases({ releaseDir, version, skipFileNames, publicUpdateBaseUrl }) {
  const entries = await readdir(releaseDir, { withFileTypes: true });
  const artifactExtensions = new Set(['.apk', '.dmg', '.pkg']);
  const releases = [];

  for (const entry of entries) {
    if (!entry.isFile() || skipFileNames.has(entry.name)) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!artifactExtensions.has(extension)) {
      continue;
    }

    const artifactVersion = versionFromFileName(entry.name);
    if (artifactVersion && artifactVersion !== version) {
      continue;
    }

    const filePath = path.join(releaseDir, entry.name);
    const fileStat = await stat(filePath);
    releases.push({
      version: artifactVersion || version,
      platform: inferPlatform(entry.name),
      fileName: entry.name,
      url: `${publicUpdateBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(entry.name)}`,
      size: fileStat.size,
      sha512: await sha512Base64(filePath),
      releaseDate
    });
  }

  return releases;
}

async function sha512Base64(filePath) {
  return createHash('sha512').update(await readFile(filePath)).digest('base64');
}

function releaseKey(release) {
  return `${release.version}::${release.platform || inferPlatform(release.fileName)}::${release.fileName}`;
}

function releaseTargetKey(release) {
  return `${release.version}::${release.platform || inferPlatform(release.fileName)}`;
}

function versionFromFileName(fileName) {
  return fileName.match(/\d+\.\d+\.\d+/)?.[0] ?? '';
}
