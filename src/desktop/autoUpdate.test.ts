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
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
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

  it('checks packaged updates without background download or install', () => {
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

    expect(updater.autoDownload).toBe(false);
    expect(updater.autoInstallOnAppQuit).toBe(false);
    expect(updater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
    });
    expect(updater.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 8000);
    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
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
    expect(updater.autoInstallOnAppQuit).toBe(false);
    expect(updater.setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://sg.lwvpscc.top/quick-translate/updates/latest'
    });
    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
  });

  it('opens the downloaded installer when the packaged updater download completes', async () => {
    const updater = createUpdater();
    const openDownloadedUpdate = vi.fn();
    const progressEvents: unknown[] = [];
    let downloadProgressListener: ((progress: unknown) => void) | undefined;
    updater.on.mockImplementation((eventName: string, listener: (...args: unknown[]) => void) => {
      if (eventName === 'download-progress') {
        downloadProgressListener = listener;
      }
      if (eventName === 'update-downloaded') {
        listener({
          downloadedFile: 'C:\\Users\\wfq\\AppData\\Local\\quick-translate-updater\\installer.exe'
        });
      }
      return undefined;
    });
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.1.22'
      },
      downloadPromise: Promise.resolve().then(() => {
        downloadProgressListener?.({
          percent: 48,
          transferred: 48_000,
          total: 100_000,
          bytesPerSecond: 12_000
        });
        return ['installer'];
      })
    });

    await expect(
      checkForDesktopUpdates({
        isPackaged: true,
        isSmokeTest: false,
        currentVersion: '0.1.21',
        platform: 'darwin',
        updater,
        openDownloadedUpdate,
        onProgress: (progress) => progressEvents.push(progress)
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22',
      message: '更新包已下载，已打开安装界面。请按安装器提示完成更新'
    });

    expect(updater.checkForUpdates).toHaveBeenCalledOnce();
    expect(updater.autoInstallOnAppQuit).toBe(false);
    expect(openDownloadedUpdate).toHaveBeenCalledWith(
      'C:\\Users\\wfq\\AppData\\Local\\quick-translate-updater\\installer.exe'
    );
    expect(updater.removeListener).toHaveBeenCalledWith('download-progress', expect.any(Function));
    expect(updater.removeListener).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    expect(progressEvents).toEqual([
      {
        status: 'checking',
        percent: 0,
        message: '正在检查更新'
      },
      {
        status: 'downloading',
        percent: 48,
        transferred: 48_000,
        total: 100_000,
        bytesPerSecond: 12_000,
        message: '正在下载更新'
      },
      {
        status: 'downloaded',
        percent: 100,
        message: '更新已下载'
      }
    ]);
  });

  it('uses the downloaded promise path when no update-downloaded event is available', async () => {
    const updater = createUpdater();
    const openDownloadedUpdate = vi.fn();
    updater.checkForUpdates.mockResolvedValue({
      updateInfo: {
        version: '0.1.22'
      },
      downloadPromise: Promise.resolve(['C:\\Temp\\installer.exe'])
    });

    await expect(
      checkForDesktopUpdates({
        isPackaged: true,
        isSmokeTest: false,
        currentVersion: '0.1.21',
        platform: 'darwin',
        updater,
        openDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22',
      message: '更新包已下载，已打开安装界面。请按安装器提示完成更新'
    });

    expect(openDownloadedUpdate).toHaveBeenCalledWith('C:\\Temp\\installer.exe');
  });
});

function createUpdater() {
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn().mockResolvedValue(null),
    on: vi.fn(),
    removeListener: vi.fn(),
    setFeedURL: vi.fn()
  };
}
