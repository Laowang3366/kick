export const defaultUpdateArtifactRetentionCount = 2;

export type RetentionTimestampedItem = {
  updatedAt?: string;
  preserve?: boolean;
};

export function compareRetentionItemsByUpdatedAtDescending(
  left: RetentionTimestampedItem,
  right: RetentionTimestampedItem
) {
  return getRetentionTimestampMs(right.updatedAt) - getRetentionTimestampMs(left.updatedAt);
}

export function getRetentionTimestampMs(updatedAt: string | undefined) {
  if (!updatedAt) {
    return 0;
  }

  const updatedAtMs = Date.parse(updatedAt);
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
}

export function shouldRetainVersion(
  version: string,
  retainedVersions: ReadonlySet<string>,
  preservedVersions: ReadonlySet<string>
) {
  return retainedVersions.has(version) || preservedVersions.has(version);
}
