import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const existingManifest = await readExistingManifest(outputPath);
const releases = [
  release,
  ...existingManifest.releases.filter((item) => item.version !== version)
].sort((left, right) => compareVersions(right.version, left.version));

await mkdir(dataDir, { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      latestVersion: version,
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

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}
