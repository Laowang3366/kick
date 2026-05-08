import { rm } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planReleaseArtifactPrune } from './releaseArtifactRetention.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = process.env.QUICK_TRANSLATE_RELEASE_DIR ?? path.join(projectRoot, 'release');
const maxVersions = Number.parseInt(process.env.QUICK_TRANSLATE_RELEASE_KEEP_VERSIONS ?? '2', 10);
const entries = await readdir(releaseDir, { withFileTypes: true });
const staleFileNames = planReleaseArtifactPrune(entries, Number.isFinite(maxVersions) ? maxVersions : 2);

for (const fileName of staleFileNames) {
  await rm(path.join(releaseDir, fileName), { force: true });
}

console.log(`[发布清理] ${releaseDir} 已删除 ${staleFileNames.length} 个旧产物`);
