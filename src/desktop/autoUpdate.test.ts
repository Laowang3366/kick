import { describe, expect, it, vi } from 'vitest';
import { checkForDesktopUpdates, configureAutoUpdates } from './autoUpdate';

describe('auto update channel', () => {
  it('does not check for updates outside packaged production runs', () => {
    const updater = createUpdater();
    const schedule = vi.fn();

    expect(
      configureAutoUpdates({
        isPackaged: false,
        isSmokeTest: false,
        updater,
        schedule
      })
    ).toBe(false);

    expect(schedule).not.toHaveBeenCalled();
    expect(updater.checkForUpdatesAndNotify).not.toHaveBeenCalled();
  });

  it('does not check for updates during smoke tests', () => {
    const updater = createUpdater();
    const schedule = vi.fn();

    expect(
      configureAutoUpdates({
        isPackaged: true,
        isSmokeTest: true,
        updater,
        schedule
      })
    ).toBe(false);

    expect(schedule).not.toHaveBeenCalled();
  });

  it('enables automatic download and schedules a packaged update check', () => {
    const updater = createUpdater();
    const schedule = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });

    expect(
      configureAutoUpdates({
        isPackaged: true,
        isSmokeTest: false,
        updater,
        schedule
      })
    ).toBe(true);

    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
    });
    expect(updater.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 8000);
    expect(updater.checkForUpdatesAndNotify).toHaveBeenCalledOnce();
  });

  it('does not run renderer-requested checks outside packaged runs', async () => {
    const updater = createUpdater();

    await expect(
      checkForDesktopUpdates({
        isPackaged: false,
        isSmokeTest: false,
        currentVersion: '0.1.21',
        platform: 'win32',
        updater
      })
    ).resolves.toMatchObject({
      status: 'no-update',
      currentVersion: '0.1.21'
    });

    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('does not run renderer-requested checks during smoke tests', async () => {
    const updater = createUpdater();

    await expect(
      checkForDesktopUpdates({
        isPackaged: true,
        isSmokeTest: true,
        currentVersion: '0.1.21',
        platform: 'darwin',
        updater
      })
    ).resolves.toMatchObject({
      status: 'no-update',
      currentVersion: '0.1.21'
    });

    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('uses the updater for renderer-requested packaged checks', async () => {
    const updater = createUpdater();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.1.22'
      }
    });

    await expect(
      checkForDesktopUpdates({
        isPackaged: true,
        isSmokeTest: false,
        currentVersion: '0.1.21',
        platform: 'win32',
        updater
      })
    ).resolves.toEqual({
      status: 'update-available',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22',
      message: '发现可用更新'
    });

    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
    });
    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('reports downloaded when the packaged updater download completes', async () => {
    const updater = createUpdater();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.1.22'
      },
      downloadPromise: Promise.resolve(['installer'])
    });

    await expect(
      checkForDesktopUpdates({
        isPackaged: true,
        isSmokeTest: false,
        currentVersion: '0.1.21',
        platform: 'darwin',
        updater
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22'
    });

    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
  });
});

function createUpdater() {
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn().mockResolvedValue(null),
    checkForUpdatesAndNotify: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    setFeedURL: vi.fn()
  };
}
