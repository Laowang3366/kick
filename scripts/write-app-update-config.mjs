import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const releaseDir = 'release';
const resourcesDir = path.join(releaseDir, 'win-unpacked', 'resources');
const appUpdateConfigPath = path.join(resourcesDir, 'app-update.yml');

export function createAppUpdateConfig(packageJson) {
  const publishEntries = Array.isArray(packageJson?.build?.publish) ? packageJson.build.publish : [];
  const genericEntry = publishEntries.find((entry) => entry?.provider === 'generic');

  if (!genericEntry?.url) {
    throw new Error('缺少 build.publish generic 更新源配置');
  }

  const updaterCacheDirName = `${String(packageJson.name || 'quick-translate')}-updater`;

  return [
    'provider: generic',
    `url: ${genericEntry.url}`,
    `updaterCacheDirName: ${updaterCacheDirName}`,
    ''
  ].join('\n');
}

export async function writeAppUpdateConfig(outputPath = appUpdateConfigPath) {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const config = createAppUpdateConfig(packageJson);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, config);
  return outputPath;
}

async function main() {
  const outputPath = await writeAppUpdateConfig();
  console.log(`[更新通道检查] 已写入 ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[更新通道检查] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
