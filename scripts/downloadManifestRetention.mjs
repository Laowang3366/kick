export function keepLatestVersions(releases, maxVersions) {
  const normalizedLimit = Math.max(0, Number.isFinite(maxVersions) ? Math.floor(maxVersions) : 0);
  if (normalizedLimit === 0) {
    return [];
  }

  const sortedReleases = [...releases].sort((left, right) => compareVersions(stringVersion(right.version), stringVersion(left.version)));
  const keptVersions = new Set();

  return sortedReleases.filter((release) => {
    const version = stringVersion(release.version);
    if (keptVersions.has(version)) {
      return true;
    }

    if (keptVersions.size >= normalizedLimit) {
      return false;
    }

    keptVersions.add(version);
    return true;
  });
}

export function compareVersions(left, right) {
  const leftParts = stringVersion(left).split('.').map(Number);
  const rightParts = stringVersion(right).split('.').map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function stringVersion(value) {
  return typeof value === 'string' ? value : '';
}
