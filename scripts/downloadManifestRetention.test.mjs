import { describe, expect, it } from 'vitest';
import { keepLatestVersions } from './downloadManifestRetention.mjs';

describe('download manifest retention', () => {
  it('keeps the latest two versions for each platform', () => {
    const releases = [
      release('0.1.40', 'windows'),
      release('0.1.39', 'windows'),
      release('0.1.37', 'windows'),
      release('0.1.39', 'android'),
      release('0.1.38', 'windows'),
      release('0.1.38', 'android'),
      release('0.1.37', 'android'),
      release('0.1.36', 'windows')
    ];

    expect(keepLatestVersions(releases, 2)).toEqual([
      release('0.1.40', 'windows'),
      release('0.1.39', 'windows'),
      release('0.1.39', 'android'),
      release('0.1.38', 'android')
    ]);
  });
});

function release(version, platform) {
  return {
    version,
    platform,
    fileName: `Quick-Translate-${platform}-${version}.bin`
  };
}
