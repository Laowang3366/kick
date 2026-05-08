import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectUpdateArtifacts, validatePublishConfig } from './assert-update-channel.mjs';

describe('update channel assertions', () => {
  it('validates the generic latest channel publish config', () => {
    expect(
      validatePublishConfig({
        build: {
          publish: [
            {
              provider: 'generic',
              url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
            }
          ]
        }
      })
    ).toEqual({
      provider: 'generic',
      url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
    });
  });

  it('collects latest.yml, installer, and blockmap artifacts', async () => {
    const releaseDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-release-'));

    await writeFile(path.join(releaseDir, 'latest.yml'), 'version: 0.1.0\npath: 快捷翻译 Setup 0.1.0.exe\n');
    await writeFile(path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe'), 'installer');
    await writeFile(path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe.blockmap'), 'blockmap');

    await expect(collectUpdateArtifacts(releaseDir)).resolves.toEqual([
      path.join(releaseDir, 'latest.yml'),
      path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe'),
      path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe.blockmap')
    ]);
  });

  it('fails when latest.yml is missing from the release directory', async () => {
    const releaseDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-release-'));

    await expect(collectUpdateArtifacts(releaseDir)).rejects.toThrow('缺少 release/latest.yml');
  });
});
