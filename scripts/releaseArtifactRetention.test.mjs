import { describe, expect, it } from 'vitest';
import { planReleaseArtifactPrune } from './releaseArtifactRetention.mjs';

describe('release artifact retention', () => {
  it('prunes versioned artifacts outside the latest two versions for each platform', () => {
    const entries = [
      file('Quick-Translate-0.1.40.exe'),
      file('Quick-Translate-0.1.40.exe.blockmap'),
      file('Quick-Translate-Android-0.1.40.apk'),
      file('Quick-Translate-0.1.39.exe'),
      file('Quick-Translate-Android-0.1.39.apk'),
      file('Quick-Translate-0.1.38.exe'),
      file('Quick-Translate-0.1.38.exe.blockmap'),
      file('Quick-Translate-Android-0.1.38.apk'),
      file('dist-0.1.37.tgz'),
      file('latest.yml'),
      file('builder-debug.yml'),
      directory('win-unpacked')
    ];

    expect(planReleaseArtifactPrune(entries, 2)).toEqual([
      'Quick-Translate-0.1.38.exe',
      'Quick-Translate-0.1.38.exe.blockmap',
      'Quick-Translate-Android-0.1.38.apk',
      'dist-0.1.37.tgz'
    ]);
  });

  it('keeps the latest mobile artifact when only Windows receives newer releases', () => {
    const entries = [
      file('Quick-Translate-0.1.55.exe'),
      file('Quick-Translate-0.1.55.exe.blockmap'),
      file('Quick-Translate-0.1.54.exe'),
      file('Quick-Translate-0.1.54.exe.blockmap'),
      file('Quick-Translate-Android-0.1.53.apk'),
      file('Quick-Translate-Android-0.1.52.apk'),
      file('Quick-Translate-Android-0.1.51.apk')
    ];

    expect(planReleaseArtifactPrune(entries, 2)).toEqual(['Quick-Translate-Android-0.1.51.apk']);
  });
});

function file(name) {
  return { name, isFile: () => true, isDirectory: () => false };
}

function directory(name) {
  return { name, isFile: () => false, isDirectory: () => true };
}
