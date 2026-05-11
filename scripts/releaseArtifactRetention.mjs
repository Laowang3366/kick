import { compareVersions } from './downloadManifestRetention.mjs';

export function planReleaseArtifactPrune(entries, maxVersions) {
  const versionsByPlatform = latestVersionsByPlatform(entries, maxVersions);

  return entries
    .filter((entry) => entry.isFile?.())
    .filter((entry) => {
      const version = versionFromFileName(entry.name);
      const platform = platformFromFileName(entry.name);
      return version && !versionsByPlatform.get(platform)?.has(version);
    })
    .map((entry) => entry.name);
}

function latestVersionsByPlatform(entries, maxVersions) {
  const normalizedLimit = Math.max(0, Number.isFinite(maxVersions) ? Math.floor(maxVersions) : 0);
  const versionsByPlatform = new Map();

  for (const entry of entries.filter((item) => item.isFile?.())) {
    const version = versionFromFileName(entry.name);
    if (!version) {
      continue;
    }

    const platform = platformFromFileName(entry.name);
    const versions = versionsByPlatform.get(platform) ?? new Set();
    versions.add(version);
    versionsByPlatform.set(platform, versions);
  }

  return new Map(
    [...versionsByPlatform].map(([platform, versions]) => [
      platform,
      new Set([...versions].sort((left, right) => compareVersions(right, left)).slice(0, normalizedLimit))
    ])
  );
}

function versionFromFileName(fileName) {
  return String(fileName).match(/\d+\.\d+\.\d+/)?.[0] ?? '';
}

function platformFromFileName(fileName) {
  const normalized = String(fileName).toLowerCase();
  if (normalized.includes('android') || normalized.endsWith('.apk') || normalized.endsWith('.aab')) {
    return 'android';
  }
  if (normalized.includes('mac') || normalized.endsWith('.dmg') || normalized.endsWith('.pkg')) {
    return 'macos';
  }
  if (normalized.includes('ios') || normalized.endsWith('.ipa')) {
    return 'ios';
  }
  return 'windows';
}
