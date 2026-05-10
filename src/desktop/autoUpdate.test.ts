import { describe, expect, it, vi } from 'vitest';
import { checkForDesktopUpdates, configureAutoUpdates, openInstallerBeforeAppQuit, openInstallerDetached } from './autoUpdate';

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
    const stageDownloadedUpdate = vi.fn().mockResolvedValue('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.22.exe');
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
        stageDownloadedUpdate,
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
    expect(stageDownloadedUpdate).toHaveBeenCalledWith(
      'C:\\Users\\wfq\\AppData\\Local\\quick-translate-updater\\installer.exe',
      '0.1.22'
    );
    expect(openDownloadedUpdate).toHaveBeenCalledWith(
      'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.22.exe'
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
    const stageDownloadedUpdate = vi.fn().mockResolvedValue('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.22.exe');
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
        stageDownloadedUpdate,
        openDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22',
      message: '更新包已下载，已打开安装界面。请按安装器提示完成更新'
    });

    expect(stageDownloadedUpdate).toHaveBeenCalledWith('C:\\Temp\\installer.exe', '0.1.22');
    expect(openDownloadedUpdate).toHaveBeenCalledWith('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.22.exe');
  });

  it('falls back to the updater cache installer when staging the copy fails', async () => {
    const updater = createUpdater();
    const openDownloadedUpdate = vi.fn();
    const stageDownloadedUpdate = vi.fn().mockRejectedValue(new Error('copy failed'));
    const logger = { warn: vi.fn() };
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
        platform: 'win32',
        updater,
        logger,
        stageDownloadedUpdate,
        openDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22'
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('保存安装包副本失败'));
    expect(openDownloadedUpdate).toHaveBeenCalledWith('C:\\Temp\\installer.exe');
  });

  it('opens the Windows installer through the system shell', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('');

    await openInstallerDetached('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.33.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath
    });

    expect(shellOpenPath).toHaveBeenCalledWith('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.33.exe');
    expect(launcher).not.toHaveBeenCalled();
  });

  it('falls back to direct process launch when Windows shell open fails', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('shell blocked');

    await openInstallerDetached('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.33.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath
    });

    expect(launcher).toHaveBeenCalledWith(
      'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.33.exe',
      [],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('starts an independent handoff helper before the current app quits', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('');
    const scriptWriter = vi.fn();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 4321,
      tempDirectory: 'C:\\Temp',
      scriptWriter
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expect(launcher).toHaveBeenCalledWith(
      expect.stringContaining('powershell.exe'),
      expect.arrayContaining(['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command']),
      {
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('launches an independent handoff helper that waits for the app to exit before opening the Windows installer', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('');
    const scriptWriter = vi.fn();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      installDirectory: 'D:\\Tools\\快捷翻译',
      currentProcessId: 4321,
      tempDirectory: 'C:\\Temp',
      scriptWriter
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    const [command, args, options] = launcher.mock.calls[0];
    expect(command).toContain('powershell.exe');
    expect(args).toEqual(
      expect.arrayContaining(['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command'])
    );
    expect(args).not.toContain('-File');
    expect(args.at(-1)).toContain('Start-Process -WindowStyle Hidden');
    expect(args.at(-1)).toContain("'-File'");
    expect(args.at(-1)).toContain("'C:\\Temp\\QuickTranslateUpdateLauncher-4321.ps1'");
    expect(scriptWriter).toHaveBeenCalledWith(
      'C:\\Temp\\QuickTranslateUpdateLauncher-4321.ps1',
      expect.stringContaining('$processId = 4321')
    );
    expect(scriptWriter.mock.calls[0][1]).toContain(
      "$filePath = 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe'"
    );
    expect(scriptWriter.mock.calls[0][1]).toContain('Start-Process @startOptions');
    expect(scriptWriter.mock.calls[0][1]).toContain("'/D=D:\\Tools\\快捷翻译'");
    expect(scriptWriter.mock.calls[0][1]).toContain('Add-Content');
    expect(options).toEqual({
      detached: false,
      stdio: 'ignore',
      windowsHide: true
    });
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('uses the handoff helper even when the install directory is unavailable', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('shell blocked');
    const scriptWriter = vi.fn();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 4321,
      tempDirectory: 'C:\\Temp',
      scriptWriter
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expect(launcher).toHaveBeenCalledWith(
      expect.stringContaining('powershell.exe'),
      expect.arrayContaining(['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command']),
      {
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('does not use the shell opener when launching the installer before quit', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('shell blocked');
    const scriptWriter = vi.fn();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 4321,
      tempDirectory: 'C:\\Temp',
      scriptWriter
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expect(launcher).toHaveBeenCalledWith(
      expect.stringContaining('powershell.exe'),
      expect.arrayContaining(['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command']),
      {
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('uses the platform shell opener outside Windows', async () => {
    const launcher = vi.fn();
    const shellOpenPath = vi.fn().mockResolvedValue('');

    await openInstallerDetached('/Users/wfq/Downloads/Quick-Translate-0.1.33.dmg', {
      platform: 'darwin',
      launcher,
      shellOpenPath
    });

    expect(shellOpenPath).toHaveBeenCalledWith('/Users/wfq/Downloads/Quick-Translate-0.1.33.dmg');
    expect(launcher).not.toHaveBeenCalled();
  });

  it('can quit the running desktop app after opening the installer', async () => {
    const updater = createUpdater();
    const openDownloadedUpdate = vi.fn();
    const quitAfterOpenDownloadedUpdate = vi.fn();
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
        platform: 'win32',
        updater,
        openDownloadedUpdate,
        quitAfterOpenDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      availableVersion: '0.1.22'
    });

    expect(openDownloadedUpdate).toHaveBeenCalledWith('C:\\Temp\\installer.exe');
    expect(quitAfterOpenDownloadedUpdate).toHaveBeenCalledOnce();
  });

  it('does not report success when opening the downloaded installer fails', async () => {
    const updater = createUpdater();
    const logger = { warn: vi.fn() };
    const openDownloadedUpdate = vi.fn().mockRejectedValue(new Error('open failed'));
    const quitAfterOpenDownloadedUpdate = vi.fn();
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
        platform: 'win32',
        updater,
        logger,
        openDownloadedUpdate,
        quitAfterOpenDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'error',
      currentVersion: '0.1.21',
      message: 'open failed'
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('打开安装包失败'));
    expect(quitAfterOpenDownloadedUpdate).not.toHaveBeenCalled();
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
