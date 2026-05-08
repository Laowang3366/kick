import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectUpdateArtifacts, validatePublishConfig } from './assert-update-channel.mjs';
import { createAppUpdateConfig } from './write-app-update-config.mjs';

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

  it('creates the packaged app update config from the publish config', () => {
    expect(
      createAppUpdateConfig({
        name: 'quick-translate',
        build: {
          publish: [
            {
              provider: 'generic',
              url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
            }
          ]
        }
      })
    ).toBe(
      [
        'provider: generic',
        'url: https://sg.lwvpscc.top/quick-translate/updates/latest',
        'updaterCacheDirName: quick-translate-updater',
        ''
      ].join('\n')
    );
  });

  it('collects latest.yml, installer, blockmap, and app-update.yml artifacts', async () => {
    const releaseDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-release-'));
    const resourcesDir = path.join(releaseDir, 'win-unpacked', 'resources');
    await mkdir(resourcesDir, { recursive: true });

    await writeFile(path.join(releaseDir, 'latest.yml'), 'version: 0.1.0\npath: 快捷翻译 Setup 0.1.0.exe\n');
    await writeFile(path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe'), 'installer');
    await writeFile(path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe.blockmap'), 'blockmap');
    await writeFile(
      path.join(resourcesDir, 'app-update.yml'),
      'provider: generic\nurl: https://sg.lwvpscc.top/quick-translate/updates/latest\n'
    );

    await expect(collectUpdateArtifacts(releaseDir)).resolves.toEqual([
      path.join(releaseDir, 'latest.yml'),
      path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe'),
      path.join(releaseDir, '快捷翻译 Setup 0.1.0.exe.blockmap'),
      path.join(resourcesDir, 'app-update.yml')
    ]);
  });

  it('fails when latest.yml is missing from the release directory', async () => {
    const releaseDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-release-'));

    await expect(collectUpdateArtifacts(releaseDir)).rejects.toThrow('缺少 release/latest.yml');
  });
});
