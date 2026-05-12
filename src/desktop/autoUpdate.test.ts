import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkForDesktopUpdates,
  configureAutoUpdates,
  getDesktopUpdateFeedUrl,
  openInstallerBeforeAppQuit,
  openInstallerDetached
} from './autoUpdate';

describe('auto update channel', () => {
  afterEach(async () => {
    await rm(getLauncherTempDirectory(), { recursive: true, force: true });
  });

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

  it('reads the desktop update feed from package publish config', () => {
    expect(
      getDesktopUpdateFeedUrl({
        build: {
          publish: [
            {
              provider: 'generic',
              url: 'https://example.test/updates'
            }
          ]
        }
      })
    ).toBe('https://example.test/updates');
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
      },
      {
        status: 'downloaded',
        percent: 100,
        message: '更新已下载，正在打开安装器'
      },
      {
        status: 'downloaded',
        percent: 100,
        message: '安装器已打开，请按安装窗口完成更新'
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

  it('opens the updater cache installer on Windows without staging another package copy', async () => {
    const updater = createUpdater();
    const callOrder: string[] = [];
    const stageDownloadedUpdate = vi.fn().mockImplementation(() => {
      callOrder.push('stage');
      return Promise.resolve('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.22.exe');
    });
    const openDownloadedUpdate = vi.fn().mockImplementation(() => {
      callOrder.push('open');
      expect(stageDownloadedUpdate).not.toHaveBeenCalled();
    });
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
        stageDownloadedUpdate,
        openDownloadedUpdate
      })
    ).resolves.toMatchObject({
      status: 'downloaded',
      currentVersion: '0.1.21',
      availableVersion: '0.1.22'
    });

    expect(openDownloadedUpdate).toHaveBeenCalledWith('C:\\Temp\\installer.exe');
    expect(stageDownloadedUpdate).not.toHaveBeenCalled();
    expect(callOrder).toEqual(['open']);
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
        cwd: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包',
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('hands off the Windows installer until the current app process exits', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('');
    const tempDirectory = getLauncherTempDirectory();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 12345,
      tempDirectory,
      allowPowerShellFallback: true
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expectWindowsHandoffLaunch(launcher, {
      installerPath: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe',
      currentProcessId: '12345',
      tempDirectory,
      installDirectory: ''
    });
    await expect(readTransactionState(tempDirectory, '12345')).resolves.toMatchObject({
      status: 'waiting-app-exit',
      installerPath: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe',
      currentProcessId: 12345
    });
    await expect(readFile(path.join(tempDirectory, 'QuickTranslateUpdateLauncher-12345.ps1'), 'utf8')).resolves.not.toContain(
      'Get-CimInstance'
    );
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('passes the previous install directory to the handed-off Windows installer', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('');
    const tempDirectory = getLauncherTempDirectory();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      installDirectory: 'D:\\Tools\\快捷翻译',
      currentProcessId: 12345,
      tempDirectory,
      allowPowerShellFallback: true
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expectWindowsHandoffLaunch(launcher, {
      installerPath: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe',
      currentProcessId: '12345',
      tempDirectory,
      installDirectory: 'D:\\Tools\\快捷翻译'
    });
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('uses the packaged update coordinator executable when available', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const tempDirectory = getLauncherTempDirectory();
    const updateCoordinatorPath = path.join(tempDirectory, 'QuickTranslateUpdateCoordinator.exe');
    await mkdir(tempDirectory, { recursive: true });
    await writeFile(updateCoordinatorPath, 'helper');

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe', {
      platform: 'win32',
      launcher,
      updateCoordinatorPath,
      installDirectory: 'D:\\Tools\\快捷翻译',
      currentProcessId: 12345,
      tempDirectory
    });

    expect(launcher).toHaveBeenCalledWith(
      updateCoordinatorPath,
      [
        '--installer',
        'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe',
        '--working-dir',
        'C:\\Users\\wfq\\Downloads\\快捷翻译更新包',
        '--current-pid',
        '12345',
        '--log',
        path.join(tempDirectory, 'QuickTranslateUpdateLauncher-12345.log'),
        '--transaction',
        path.join(tempDirectory, 'QuickTranslateUpdateTransaction-12345.json'),
        '--install-dir',
        'D:\\Tools\\快捷翻译',
        '--installer-arg',
        `/QUICK_TRANSLATE_TRANSACTION=${path.join(tempDirectory, 'QuickTranslateUpdateTransaction-12345.json')}`,
        '--installer-arg',
        '/D=D:\\Tools\\快捷翻译'
      ],
      {
        cwd: tempDirectory,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    );
    expect(child.unref).toHaveBeenCalledOnce();
    await expect(readTransactionState(tempDirectory, '12345')).resolves.toMatchObject({
      coordinatorPath: updateCoordinatorPath
    });
  });

  it('fails explicitly when the packaged update coordinator is missing', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const tempDirectory = getLauncherTempDirectory();
    const updateCoordinatorPath = path.join(tempDirectory, 'missing', 'QuickTranslateUpdateCoordinator.exe');

    await expect(
      openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.46.exe', {
        platform: 'win32',
        launcher,
        updateCoordinatorPath,
        installDirectory: 'D:\\Tools\\快捷翻译',
        currentProcessId: 12345,
        tempDirectory
      })
    ).rejects.toThrow('更新协调器缺失');

    expect(launcher).not.toHaveBeenCalled();
    await expect(readTransactionState(tempDirectory, '12345')).resolves.toMatchObject({
      status: 'failed',
      failureCode: 'update-coordinator-missing',
      coordinatorPath: updateCoordinatorPath
    });
    await expect(
      readFile(path.join(tempDirectory, 'QuickTranslateUpdateLauncher-12345.ps1'), 'utf8')
    ).rejects.toThrow();
  });

  it('hands off the Windows installer even when the install directory is unavailable', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('shell blocked');
    const tempDirectory = getLauncherTempDirectory();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 12345,
      tempDirectory,
      allowPowerShellFallback: true
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expectWindowsHandoffLaunch(launcher, {
      installerPath: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe',
      currentProcessId: '12345',
      tempDirectory,
      installDirectory: ''
    });
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it('does not use the shell opener when handing off the installer before quit', async () => {
    const child = {
      unref: vi.fn()
    };
    const launcher = vi.fn(() => child);
    const shellOpenPath = vi.fn().mockResolvedValue('shell blocked');
    const tempDirectory = getLauncherTempDirectory();

    await openInstallerBeforeAppQuit('C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe', {
      platform: 'win32',
      launcher,
      shellOpenPath,
      currentProcessId: 12345,
      tempDirectory,
      allowPowerShellFallback: true
    });

    expect(shellOpenPath).not.toHaveBeenCalled();
    expectWindowsHandoffLaunch(launcher, {
      installerPath: 'C:\\Users\\wfq\\Downloads\\快捷翻译更新包\\Quick-Translate-0.1.39.exe',
      currentProcessId: '12345',
      tempDirectory,
      installDirectory: ''
    });
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

function getLauncherTempDirectory() {
  return path.join(tmpdir(), 'quick-translate-auto-update-test');
}

function expectWindowsHandoffLaunch(
  launcher: ReturnType<typeof vi.fn>,
  expected: {
    installerPath: string;
    currentProcessId: string;
    tempDirectory: string;
    installDirectory: string;
  }
) {
  expect(launcher).toHaveBeenCalledOnce();
  const [command, args, options] = launcher.mock.calls[0];
  const transactionPath = path.join(expected.tempDirectory, `QuickTranslateUpdateTransaction-${expected.currentProcessId}.json`);
  const expectedScriptArgs = [
    '-InstallerPath',
    expected.installerPath,
    '-WorkingDirectory',
    path.dirname(expected.installerPath),
    '-CurrentProcessId',
    expected.currentProcessId,
    '-LogPath',
    path.join(expected.tempDirectory, `QuickTranslateUpdateLauncher-${expected.currentProcessId}.log`),
    '-TransactionPath',
    transactionPath
  ];
  if (expected.installDirectory) {
    expectedScriptArgs.push('-InstallDirectory', expected.installDirectory);
  }
  const installerArgs = [`/QUICK_TRANSLATE_TRANSACTION=${transactionPath}`];
  if (expected.installDirectory) {
    installerArgs.push(`/D=${expected.installDirectory}`);
  }
  expectedScriptArgs.push('-ArgumentList', installerArgs.join(' '));

  expect(command).toMatch(/cmd\.exe$/i);
  expect(args.slice(0, 9)).toEqual([
    '/d',
    '/s',
    '/c',
    'start',
    '""',
    expect.stringMatching(/powershell\.exe$/i),
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass'
  ]);
  expect(args[9]).toBe('-EncodedCommand');
  expect(Buffer.from(args[10], 'base64').toString('utf16le')).toBe(
    createExpectedPowerShellScriptCommand(
      path.join(expected.tempDirectory, `QuickTranslateUpdateLauncher-${expected.currentProcessId}.ps1`),
      expectedScriptArgs
    )
  );
  expect(options).toEqual({
    cwd: expected.tempDirectory,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
}

async function readTransactionState(tempDirectory: string, processId: string) {
  return JSON.parse(await readFile(path.join(tempDirectory, `QuickTranslateUpdateTransaction-${processId}.json`), 'utf8'));
}

function createExpectedPowerShellScriptCommand(scriptPath: string, args: string[]) {
  return `& ${quoteExpectedPowerShellString(scriptPath)} ${args.map(quoteExpectedPowerShellArgument).join(' ')}`;
}

function quoteExpectedPowerShellArgument(value: string) {
  return value.startsWith('-') ? value : quoteExpectedPowerShellString(value);
}

function quoteExpectedPowerShellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}
