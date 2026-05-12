import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(projectRoot, 'tools', 'update-coordinator', 'main.go');
const outputDirectory = path.join(projectRoot, 'build', 'update-helper');
const outputPath = path.join(outputDirectory, 'QuickTranslateUpdateCoordinator.exe');

await mkdir(outputDirectory, { recursive: true });

const result = spawnSync(
  'go',
  ['build', '-trimpath', '-ldflags=-s -w', '-o', outputPath, sourcePath],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      GOOS: 'windows',
      GOARCH: 'amd64'
    },
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`更新协调器编译失败，退出码 ${result.status}`);
}

console.log(`[更新协调器] 已生成 ${outputPath}`);
