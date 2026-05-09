import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { spawn } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type AutoUpdaterLike = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates(): Promise<UpdateCheckResultLike | null>;
  on(eventName: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(eventName: string, listener: (...args: unknown[]) => void): unknown;
  setFeedURL?(options: { provider: 'generic'; url: string }): unknown;
};

type UpdateCheckResultLike = {
  updateInfo?: {
    version?: string;
  };
  downloadPromise?: Promise<unknown> | null;
};

type ConfigureAutoUpdatesOptions = {
  isPackaged: boolean;
  isSmokeTest: boolean;
  updater: AutoUpdaterLike;
  schedule: (callback: () => void, delayMs: number) => unknown;
  logger?: Pick<Console, 'warn'>;
};

type CheckForUpdatesOptions = {
  isPackaged: boolean;
  isSmokeTest: boolean;
  currentVersion: string;
  platform: NodeJS.Platform;
  updater: AutoUpdaterLike;
  logger?: Pick<Console, 'warn'>;
  onProgress?: (progress: DesktopUpdateProgress) => void;
  stageDownloadedUpdate?: (filePath: string, version?: string) => string | Promise<string>;
  openDownloadedUpdate?: (filePath: string) => void | Promise<void>;
  quitAfterOpenDownloadedUpdate?: () => void;
};

type InstallerLaunchOptions = {
  detached: boolean;
  stdio: 'ignore';
  windowsHide: boolean;
};

type InstallerLauncher = (command: string, args: string[], options: InstallerLaunchOptions) => { unref(): void };

type OpenInstallerOptions = {
  platform?: NodeJS.Platform;
  launcher?: InstallerLauncher;
  shellOpenPath?: (filePath: string) => Promise<string>;
};

type WindowsInstallerLaunchOptions = OpenInstallerOptions & {
  powershellPath?: string;
};

export type DesktopUpdateStatus = 'checking' | 'no-update' | 'update-available' | 'downloaded' | 'error';

export type DesktopUpdateCheckResult = {
  status: DesktopUpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  message: string;
};

export type DesktopUpdateProgress = {
  status: 'checking' | 'downloading' | 'downloaded' | 'error';
  percent: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
};

const updateCheckDelayMs = 8000;
const desktopUpdateFeedUrl = 'https://sg.lwvpscc.top/quick-translate/updates/latest';

export function configureAutoUpdates(options: ConfigureAutoUpdatesOptions): boolean {
  if (!options.isPackaged || options.isSmokeTest) {
    return false;
  }

  configureUpdaterFeed(options.updater, options.logger);
  options.updater.autoDownload = false;
  options.updater.autoInstallOnAppQuit = false;
  options.updater.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    options.logger?.warn(`[自动更新] 检查失败：${message}`);
  });

  options.schedule(() => {
    void options.updater.checkForUpdates().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      options.logger?.warn(`[自动更新] 检查失败：${message}`);
    });
  }, updateCheckDelayMs);

  return true;
}

export async function checkForDesktopUpdates(options: CheckForUpdatesOptions): Promise<DesktopUpdateCheckResult> {
  if (!options.isPackaged || options.isSmokeTest) {
    return {
      status: 'no-update',
      currentVersion: options.currentVersion,
      message: '更新检查仅在打包应用中可用'
    };
  }

  if (options.platform !== 'win32' && options.platform !== 'darwin') {
    return {
      status: 'no-update',
      currentVersion: options.currentVersion,
      message: '当前平台不支持应用内更新'
    };
  }

  options.updater.autoDownload = true;
  options.updater.autoInstallOnAppQuit = false;
  configureUpdaterFeed(options.updater, options.logger);

  let hasDownloadProgressEvent = false;
  let downloadedUpdatePath: string | undefined;
  const progressListener = (progress: unknown) => {
    hasDownloadProgressEvent = true;
    options.onProgress?.(normalizeDownloadProgress(progress));
  };
  const downloadedListener = (event: unknown) => {
    downloadedUpdatePath = getDownloadedFilePath(event) ?? downloadedUpdatePath;
  };

  if (options.onProgress) {
    options.updater.on('download-progress', progressListener);
  }
  options.updater.on('update-downloaded', downloadedListener);

  try {
    options.onProgress?.({
      status: 'checking',
      percent: 0,
      message: '正在检查更新'
    });

    const result = await options.updater.checkForUpdates();
    const availableVersion = result?.updateInfo?.version;

    if (!availableVersion || availableVersion === options.currentVersion) {
      return {
        status: 'no-update',
        currentVersion: options.currentVersion,
        availableVersion,
        message: '当前已是最新版本'
      };
    }

    if (result.downloadPromise) {
      if (!hasDownloadProgressEvent) {
        options.onProgress?.({
          status: 'downloading',
          percent: 0,
          message: '正在下载更新'
        });
      }
      const downloadedFiles = await result.downloadPromise;
      downloadedUpdatePath = downloadedUpdatePath ?? getDownloadedFilePath(downloadedFiles);
      options.onProgress?.({
        status: 'downloaded',
        percent: 100,
        message: '更新已下载'
      });

      if (downloadedUpdatePath) {
        const stagedUpdatePath = await stageDownloadedUpdate(downloadedUpdatePath, availableVersion, options);
        await openDownloadedUpdate(stagedUpdatePath, options);
        options.quitAfterOpenDownloadedUpdate?.();
        return {
          status: 'downloaded',
          currentVersion: options.currentVersion,
          availableVersion,
          message: '更新包已下载，已打开安装界面。请按安装器提示完成更新'
        };
      }

      return {
        status: 'downloaded',
        currentVersion: options.currentVersion,
        availableVersion,
        message: '更新包已下载。请在下载目录中手动运行安装包完成更新'
      };
    }

    return {
      status: 'update-available',
      currentVersion: options.currentVersion,
      availableVersion,
      message: '发现可用更新'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logger?.warn(`[自动更新] 手动检查失败：${message}`);
    options.onProgress?.({
      status: 'error',
      percent: 0,
      message
    });

    return {
      status: 'error',
      currentVersion: options.currentVersion,
      message
    };
  } finally {
    if (options.onProgress) {
      options.updater.removeListener?.('download-progress', progressListener);
    }
    options.updater.removeListener?.('update-downloaded', downloadedListener);
  }
}

export function checkForUpdates(isSmokeTest: boolean, onProgress?: (progress: DesktopUpdateProgress) => void) {
  const { autoUpdater } = electronUpdater;

  return checkForDesktopUpdates({
    isPackaged: app.isPackaged,
    isSmokeTest,
    currentVersion: app.getVersion(),
    platform: process.platform,
    updater: autoUpdater,
    logger: console,
    onProgress,
    stageDownloadedUpdate: copyDownloadedUpdateToDownloads,
    openDownloadedUpdate: process.platform === 'win32' ? openInstallerBeforeAppQuit : openInstallerDetached,
    quitAfterOpenDownloadedUpdate: process.platform === 'win32' ? scheduleQuitAfterOpeningInstaller : undefined
  });
}

export async function openInstallerDetached(filePath: string, options: OpenInstallerOptions = {}) {
  const platform = options.platform ?? process.platform;
  const shellOpenPath = options.shellOpenPath ?? shell.openPath;

  if (platform === 'win32') {
    const errorMessage = await shellOpenPath(filePath);
    if (!errorMessage) {
      return;
    }

    const launcher = options.launcher ?? spawn;
    const child = launcher(filePath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return;
  }

  const errorMessage = await shellOpenPath(filePath);
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export async function openInstallerBeforeAppQuit(filePath: string, options: WindowsInstallerLaunchOptions = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') {
    await openInstallerDetached(filePath, options);
    return;
  }

  const launcher = options.launcher ?? spawn;
  const powershellPath =
    options.powershellPath ??
    path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const installerPath = escapePowerShellSingleQuotedString(filePath);
  const installerDirectory = escapePowerShellSingleQuotedString(path.dirname(filePath));
  const command = [
    '$ErrorActionPreference = "SilentlyContinue";',
    `Start-Process -FilePath '${installerPath}' -WorkingDirectory '${installerDirectory}';`
  ].join(' ');

  const child = launcher(
    powershellPath,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }
  );
  child.unref();
}

function scheduleQuitAfterOpeningInstaller() {
  const timer = setTimeout(() => {
    app.quit();
    const forceExitTimer = setTimeout(() => {
      app.exit(0);
    }, 1500);
    forceExitTimer.unref();
  }, 500);
  timer.unref();
}

function escapePowerShellSingleQuotedString(value: string) {
  return value.replace(/'/g, "''");
}

function configureUpdaterFeed(updater: AutoUpdaterLike, logger?: Pick<Console, 'warn'>) {
  try {
    updater.setFeedURL?.({
      provider: 'generic',
      url: desktopUpdateFeedUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`[自动更新] 设置更新源失败：${message}`);
  }
}

function normalizeDownloadProgress(progress: unknown): DesktopUpdateProgress {
  if (!progress || typeof progress !== 'object') {
    return {
      status: 'downloading',
      percent: 0,
      message: '正在下载更新'
    };
  }

  const record = progress as Record<string, unknown>;
  const percent = typeof record.percent === 'number' && Number.isFinite(record.percent) ? record.percent : 0;

  return {
    status: 'downloading',
    percent: clampPercent(percent),
    transferred: numberOrUndefined(record.transferred),
    total: numberOrUndefined(record.total),
    bytesPerSecond: numberOrUndefined(record.bytesPerSecond),
    message: '正在下载更新'
  };
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getDownloadedFilePath(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (value && typeof value === 'object') {
    const downloadedFile = (value as Record<string, unknown>).downloadedFile;
    return typeof downloadedFile === 'string' && downloadedFile.trim() ? downloadedFile : undefined;
  }

  return undefined;
}

async function stageDownloadedUpdate(
  filePath: string,
  version: string | undefined,
  options: Pick<CheckForUpdatesOptions, 'logger' | 'stageDownloadedUpdate'>
) {
  try {
    return (await options.stageDownloadedUpdate?.(filePath, version)) ?? filePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logger?.warn(`[自动更新] 保存安装包副本失败，将使用原始安装包：${message}`);
    return filePath;
  }
}

async function copyDownloadedUpdateToDownloads(filePath: string, version?: string) {
  const safeVersion = typeof version === 'string' && /^\d+\.\d+\.\d+/.test(version) ? version : 'latest';
  const extension = path.extname(filePath) || (process.platform === 'darwin' ? '.dmg' : '.exe');
  const targetDirectory = path.join(app.getPath('downloads'), '快捷翻译更新包');
  const targetPath = path.join(targetDirectory, `Quick-Translate-${safeVersion}${extension}`);

  if (path.resolve(filePath).toLowerCase() === path.resolve(targetPath).toLowerCase()) {
    return filePath;
  }

  await mkdir(targetDirectory, { recursive: true });
  await copyFile(filePath, targetPath);
  return targetPath;
}

async function openDownloadedUpdate(filePath: string, options: Pick<CheckForUpdatesOptions, 'logger' | 'openDownloadedUpdate'>) {
  try {
    await options.openDownloadedUpdate?.(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.logger?.warn(`[自动更新] 打开安装包失败：${message}`);
    throw error;
  }
}

export function startAutoUpdates(isSmokeTest: boolean) {
  const { autoUpdater } = electronUpdater;

  return configureAutoUpdates({
    isPackaged: app.isPackaged,
    isSmokeTest,
    updater: autoUpdater,
    schedule: setTimeout,
    logger: console
  });
}
