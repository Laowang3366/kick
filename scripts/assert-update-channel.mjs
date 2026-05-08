import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedUpdateUrl = 'https://sg.lwvpscc.top/quick-translate/updates/latest';

export function validatePublishConfig(packageJson) {
  const publishEntries = Array.isArray(packageJson?.build?.publish) ? packageJson.build.publish : [];
  const genericEntry = publishEntries.find((entry) => entry?.provider === 'generic');

  if (!genericEntry) {
    throw new Error('缺少 build.publish generic 更新源配置');
  }

  if (genericEntry.url !== expectedUpdateUrl) {
    throw new Error(`更新源地址不正确：${genericEntry.url ?? '<empty>'}`);
  }

  return {
    provider: genericEntry.provider,
    url: genericEntry.url
  };
}

export async function collectUpdateArtifacts(releaseDir = 'release') {
  const latestYmlPath = path.join(releaseDir, 'latest.yml');
  const appUpdateYmlPath = path.join(releaseDir, 'win-unpacked', 'resources', 'app-update.yml');
  let latestYml = '';
  let appUpdateYml = '';

  try {
    latestYml = await readFile(latestYmlPath, 'utf8');
  } catch {
    throw new Error('缺少 release/latest.yml，请先运行 npm run dist:win');
  }

  try {
    appUpdateYml = await readFile(appUpdateYmlPath, 'utf8');
  } catch {
    throw new Error('缺少 release/win-unpacked/resources/app-update.yml，请先运行 npm run dist:win');
  }

  if (!appUpdateYml.includes('provider: generic') || !appUpdateYml.includes(`url: ${expectedUpdateUrl}`)) {
    throw new Error('app-update.yml 更新源配置不正确');
  }

  const installerMatch = latestYml.match(/^path:\s*(.+)$/m);
  const installerName = installerMatch?.[1]?.trim();

  if (!installerName) {
    throw new Error('release/latest.yml 缺少安装包 path 字段');
  }

  const releaseFiles = new Set(await readdir(releaseDir));
  const installerPath = path.join(releaseDir, installerName);
  const blockMapName = `${installerName}.blockmap`;
  const blockMapPath = path.join(releaseDir, blockMapName);

  if (!releaseFiles.has(installerName)) {
    throw new Error(`缺少安装包：release/${installerName}`);
  }

  if (!releaseFiles.has(blockMapName)) {
    throw new Error(`缺少 blockmap：release/${blockMapName}`);
  }

  return [latestYmlPath, installerPath, blockMapPath, appUpdateYmlPath];
}

async function main() {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const publishConfig = validatePublishConfig(packageJson);
  const artifacts = await collectUpdateArtifacts('release');

  console.log(`[更新通道检查] ${publishConfig.provider} ${publishConfig.url}`);
  for (const artifact of artifacts) {
    console.log(`[更新通道检查] ${artifact}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[更新通道检查] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
