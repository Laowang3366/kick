import { compareVersions } from './downloadManifestRetention.mjs';

export function planReleaseArtifactPrune(entries, maxVersions) {
  const versions = latestVersions(entries, maxVersions);

  return entries
    .filter((entry) => entry.isFile?.())
    .filter((entry) => {
      const version = versionFromFileName(entry.name);
      return version && !versions.has(version);
    })
    .map((entry) => entry.name);
}

function latestVersions(entries, maxVersions) {
  const normalizedLimit = Math.max(0, Number.isFinite(maxVersions) ? Math.floor(maxVersions) : 0);
  const versions = [...new Set(entries.map((entry) => versionFromFileName(entry.name)).filter(Boolean))].sort((left, right) =>
    compareVersions(right, left)
  );
  return new Set(versions.slice(0, normalizedLimit));
}

function versionFromFileName(fileName) {
  return String(fileName).match(/\d+\.\d+\.\d+/)?.[0] ?? '';
}
