import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { spawn } from 'node:child_process';
import { copyFile, link, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getDefaultUpdatePackageDirectory, normalizeUpdatePackageDirectoryPath } from './updatePackageDirectory.js';

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
  cwd?: string;
  detached: boolean;
  stdio: 'ignore';
  windowsHide: boolean;
};

type InstallerLauncherProcess = {
  unref(): void;
};
type InstallerLauncher = (command: string, args: string[], options: InstallerLaunchOptions) => InstallerLauncherProcess;

type OpenInstallerOptions = {
  platform?: NodeJS.Platform;
  launcher?: InstallerLauncher;
  shellOpenPath?: (filePath: string) => Promise<string>;
  installDirectory?: string;
};

type WindowsInstallerLaunchOptions = OpenInstallerOptions & {
  currentProcessId?: number;
  tempDirectory?: string;
};

type WindowsUpdateTransactionState = {
  id: string;
  installerPath: string;
  installDirectory?: string;
  currentProcessId: number;
  status: 'waiting-app-exit' | 'cleaning-processes' | 'launching-installer' | 'installer-started' | 'failed';
  percent: number;
  message: string;
  updatedAt: string;
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
        const stagedUpdatePath =
          options.platform === 'win32' ? downloadedUpdatePath : await stageDownloadedUpdate(downloadedUpdatePath, availableVersion, options);
        options.onProgress?.({
          status: 'downloaded',
          percent: 100,
          message: '更新已下载，正在打开安装器'
        });
        await openDownloadedUpdate(stagedUpdatePath, options);
        if (options.platform === 'win32') {
          void stageDownloadedUpdate(downloadedUpdatePath, availableVersion, options);
        }
        options.onProgress?.({
          status: 'downloaded',
          percent: 100,
          message: '安装器已打开，请按安装窗口完成更新'
        });
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

export function checkForUpdates(
  isSmokeTest: boolean,
  onProgress?: (progress: DesktopUpdateProgress) => void,
  updatePackageDirectory?: string
) {
  const { autoUpdater } = electronUpdater;

  return checkForDesktopUpdates({
    isPackaged: app.isPackaged,
    isSmokeTest,
    currentVersion: app.getVersion(),
    platform: process.platform,
    updater: autoUpdater,
    logger: console,
    onProgress,
    stageDownloadedUpdate: (filePath, version) => copyDownloadedUpdateToPackageDirectory(filePath, version, updatePackageDirectory),
    openDownloadedUpdate:
      process.platform === 'win32'
        ? (filePath) =>
            openInstallerBeforeAppQuit(filePath, {
              installDirectory: getCurrentInstallDirectory(),
              currentProcessId: process.pid,
              tempDirectory: getCurrentTempDirectory()
            })
        : openInstallerDetached,
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
    launchInstallerProcess(filePath, [], true, launcher);
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

  const installerArgs = getWindowsInstallerArgs(options.installDirectory);
  await launchInstallerAfterCurrentProcessExit(filePath, installerArgs, options);
}

function launchInstallerProcess(filePath: string, args: string[], windowsHide: boolean, launcher: InstallerLauncher = spawn) {
  const child = launcher(filePath, args, {
    cwd: path.dirname(filePath),
    detached: true,
    stdio: 'ignore',
    windowsHide
  });
  child.unref();
}

async function launchInstallerAfterCurrentProcessExit(
  filePath: string,
  installerArgs: string[],
  options: WindowsInstallerLaunchOptions
) {
  const currentProcessId = options.currentProcessId ?? process.pid;
  const tempDirectory = options.tempDirectory ?? getCurrentTempDirectory();
  const launcherScriptPath = path.join(tempDirectory, `QuickTranslateUpdateLauncher-${currentProcessId}.ps1`);
  const logPath = path.join(tempDirectory, `QuickTranslateUpdateLauncher-${currentProcessId}.log`);
  const transactionPath = path.join(tempDirectory, `QuickTranslateUpdateTransaction-${currentProcessId}.json`);
  await mkdir(tempDirectory, { recursive: true });
  await writeFile(launcherScriptPath, `\ufeff${windowsUpdateLauncherScript}`, 'utf8');
  await writeWindowsUpdateTransaction(transactionPath, {
    id: String(currentProcessId),
    installerPath: filePath,
    installDirectory: options.installDirectory,
    currentProcessId,
    status: 'waiting-app-exit',
    percent: 10,
    message: '正在等待旧版本退出',
    updatedAt: new Date().toISOString()
  });
  const scriptArgs = [
    '-InstallerPath',
    filePath,
    '-WorkingDirectory',
    path.dirname(filePath),
    '-CurrentProcessId',
    String(currentProcessId),
    '-LogPath',
    logPath,
    '-TransactionPath',
    transactionPath
  ];
  if (options.installDirectory?.trim()) {
    scriptArgs.push('-InstallDirectory', options.installDirectory.trim());
  }
  if (installerArgs.length > 0) {
    scriptArgs.push('-ArgumentList', installerArgs.join(' '));
  }
  const powershellArgs = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-EncodedCommand',
    encodePowerShellCommand(createPowerShellScriptCommand(launcherScriptPath, scriptArgs))
  ];

  const child = (options.launcher ?? spawn)(
    getWindowsCmdPath(),
    ['/d', '/s', '/c', 'start', '""', getWindowsPowerShellPath(), ...powershellArgs],
    {
      cwd: tempDirectory,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }
  );
  child.unref();
}

async function writeWindowsUpdateTransaction(transactionPath: string, state: WindowsUpdateTransactionState) {
  await writeFile(transactionPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function createPowerShellScriptCommand(scriptPath: string, args: string[]) {
  const quotedArgs = args.map(quotePowerShellArgument).join(' ');
  return `& ${quotePowerShellString(scriptPath)} ${quotedArgs}`;
}

function quotePowerShellArgument(value: string) {
  return value.startsWith('-') ? value : quotePowerShellString(value);
}

function quotePowerShellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function encodePowerShellCommand(command: string) {
  return Buffer.from(command, 'utf16le').toString('base64');
}

function getWindowsInstallerArgs(installDirectory: string | undefined) {
  const normalizedInstallDirectory = installDirectory?.trim();
  return normalizedInstallDirectory ? [`/D=${normalizedInstallDirectory}`] : [];
}

function getCurrentInstallDirectory() {
  try {
    return path.dirname(app.getPath('exe'));
  } catch {
    return path.dirname(process.execPath);
  }
}

function scheduleQuitAfterOpeningInstaller() {
  const timer = setTimeout(() => {
    app.quit();
    const forceExitTimer = setTimeout(() => {
      app.exit(0);
    }, 600);
    forceExitTimer.unref();
  }, 100);
  timer.unref();
}

function getCurrentTempDirectory() {
  try {
    return app.getPath('temp');
  } catch {
    return process.env.TEMP || process.env.TMP || tmpdir();
  }
}

function getWindowsPowerShellPath() {
  return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

function getWindowsCmdPath() {
  return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
}

const windowsUpdateLauncherScript = String.raw`param(
  [string]$InstallerPath,
  [string]$WorkingDirectory,
  [int]$CurrentProcessId,
  [string]$ArgumentList,
  [string]$LogPath,
  [string]$TransactionPath,
  [string]$InstallDirectory
)

function Write-QuickTranslateUpdateLog([string]$Message) {
  try {
    Add-Content -LiteralPath $LogPath -Value "$(Get-Date -Format o) $Message" -Encoding UTF8
  } catch {}
}

function Write-QuickTranslateUpdateState([string]$Status, [int]$Percent, [string]$Message) {
  try {
    $state = [ordered]@{
      id = [string]$CurrentProcessId
      installerPath = $InstallerPath
      installDirectory = $InstallDirectory
      currentProcessId = $CurrentProcessId
      status = $Status
      percent = $Percent
      message = $Message
      updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    }
    $state | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $TransactionPath -Encoding UTF8
  } catch {}
}

function Stop-QuickTranslateProcesses {
  Write-QuickTranslateUpdateState "cleaning-processes" 45 "正在清理旧版本进程"
  Write-QuickTranslateUpdateLog "cleanup started"
  try {
    if ($CurrentProcessId -gt 0) {
      $current = Get-Process -Id $CurrentProcessId -ErrorAction SilentlyContinue
      if ($null -ne $current) {
        & "$env:SystemRoot\System32\taskkill.exe" /PID $CurrentProcessId /T /F | Out-Null
      }
    }

    $names = @("快捷翻译.exe", "quick-translate.exe")
    $processes = Get-CimInstance -ClassName Win32_Process | Where-Object {
      (($InstallDirectory -ne "") -and $_.ExecutablePath -and $_.ExecutablePath.StartsWith($InstallDirectory, [System.StringComparison]::CurrentCultureIgnoreCase)) -or
      ($names -contains $_.Name) -or
      ($_.CommandLine -like "*quick-translate-*hook.ps1*") -or
      ($_.CommandLine -like "*quick-translate-copy-shortcut.ps1*")
    }
    $ids = @($processes | ForEach-Object { $_.ProcessId } | Where-Object { $_ -ne $PID })
    if ($ids.Count -gt 0) {
      $ids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
      Start-Sleep -Milliseconds 200
      $ids | ForEach-Object { Wait-Process -Id $_ -Timeout 2 -ErrorAction SilentlyContinue }
    }
  } catch {
    Write-QuickTranslateUpdateLog ("cleanup warning: " + $_.Exception.Message)
  }
  Write-QuickTranslateUpdateLog "cleanup finished"
}

Write-QuickTranslateUpdateLog "launcher started"
Write-QuickTranslateUpdateState "waiting-app-exit" 15 "正在等待旧版本退出"
$deadline = (Get-Date).AddSeconds(2)
while ($CurrentProcessId -gt 0 -and (Get-Date) -lt $deadline) {
  $runningProcess = Get-Process -Id $CurrentProcessId -ErrorAction SilentlyContinue
  if ($null -eq $runningProcess) {
    break
  }
  Start-Sleep -Milliseconds 100
}

Stop-QuickTranslateProcesses
Start-Sleep -Milliseconds 150
Write-QuickTranslateUpdateLog "installer start requested"
Write-QuickTranslateUpdateState "launching-installer" 80 "正在启动安装器"
try {
  if ([string]::IsNullOrWhiteSpace($ArgumentList)) {
    Start-Process -FilePath $InstallerPath -WorkingDirectory $WorkingDirectory
  } else {
    Start-Process -FilePath $InstallerPath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory
  }
  Write-QuickTranslateUpdateLog "installer started"
  Write-QuickTranslateUpdateState "installer-started" 100 "安装器已启动"
} catch {
  Write-QuickTranslateUpdateLog ("installer failed: " + $_.Exception.Message)
  Write-QuickTranslateUpdateState "failed" 100 ("安装器启动失败：" + $_.Exception.Message)
  exit 1
}
`;

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

async function copyDownloadedUpdateToPackageDirectory(filePath: string, version?: string, updatePackageDirectory?: string) {
  const safeVersion = typeof version === 'string' && /^\d+\.\d+\.\d+/.test(version) ? version : 'latest';
  const extension = path.extname(filePath) || (process.platform === 'darwin' ? '.dmg' : '.exe');
  const targetDirectory = normalizeUpdatePackageDirectoryPath(
    updatePackageDirectory,
    getDefaultUpdatePackageDirectory(app.getPath('downloads'))
  );
  const targetPath = path.join(targetDirectory, `Quick-Translate-${safeVersion}${extension}`);

  if (path.resolve(filePath).toLowerCase() === path.resolve(targetPath).toLowerCase()) {
    return filePath;
  }

  await mkdir(targetDirectory, { recursive: true });
  await rm(targetPath, { force: true });
  try {
    await link(filePath, targetPath);
  } catch {
    await copyFile(filePath, targetPath);
  }
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
