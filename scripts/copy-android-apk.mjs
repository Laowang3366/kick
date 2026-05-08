import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const sourceApk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const releaseDir = path.join(projectRoot, 'release');
const targetApk = path.join(releaseDir, `快捷翻译 Android ${version}.apk`);

await stat(sourceApk);
await mkdir(releaseDir, { recursive: true });
await copyFile(sourceApk, targetApk);

console.log(`[Android APK] 已写入 ${targetApk}`);
