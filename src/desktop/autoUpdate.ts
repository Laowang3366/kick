import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, link, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  updateCoordinatorPath?: string;
};

export type WindowsUpdateTransactionStatus =
  | 'waiting-app-exit'
  | 'cleaning-processes'
  | 'launching-installer'
  | 'installer-started'
  | 'failed'
  | 'done'
  | 'installed';

export type WindowsUpdateTransactionState = {
  id: string;
  installerPath: string;
  installDirectory?: string;
  currentProcessId: number;
  status: WindowsUpdateTransactionStatus;
  percent: number;
  message: string;
  updatedAt: string;
};

export type WindowsUpdateTransactionSnapshot = WindowsUpdateTransactionState & {
  transactionPath: string;
  logPath: string;
  logDirectory: string;
  failed: boolean;
  stale: boolean;
  recoverable: boolean;
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
const staleUpdateTransactionMs = 10 * 60 * 1000;
const updateTransactionFilePattern = /^QuickTranslateUpdateTransaction-(.+)\.json$/;

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
  const coordinatorPath = options.updateCoordinatorPath ?? getPackagedWindowsUpdateCoordinatorPath();
  if (coordinatorPath && existsSync(coordinatorPath)) {
    const coordinatorArgs = createWindowsUpdateCoordinatorArgs({
      filePath,
      workingDirectory: path.dirname(filePath),
      currentProcessId,
      logPath,
      transactionPath,
      installDirectory: options.installDirectory,
      argumentList: installerArgs.join(' ')
    });
    const child = (options.launcher ?? spawn)(coordinatorPath, coordinatorArgs, {
      cwd: tempDirectory,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return;
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

function createWindowsUpdateCoordinatorArgs(input: {
  filePath: string;
  workingDirectory: string;
  currentProcessId: number;
  logPath: string;
  transactionPath: string;
  installDirectory?: string;
  argumentList?: string;
}) {
  const args = [
    '--installer',
    input.filePath,
    '--working-dir',
    input.workingDirectory,
    '--current-pid',
    String(input.currentProcessId),
    '--log',
    input.logPath,
    '--transaction',
    input.transactionPath
  ];

  if (input.installDirectory?.trim()) {
    args.push('--install-dir', input.installDirectory.trim());
  }

  if (input.argumentList?.trim()) {
    args.push('--argument-list', input.argumentList.trim());
  }

  return args;
}

function getPackagedWindowsUpdateCoordinatorPath() {
  if (!app?.isPackaged) {
    return undefined;
  }

  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  return resourcesPath ? path.join(resourcesPath, 'update-helper', 'QuickTranslateUpdateCoordinator.exe') : undefined;
}

async function writeWindowsUpdateTransaction(transactionPath: string, state: WindowsUpdateTransactionState) {
  await writeFile(transactionPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function getLatestUpdateTransaction(
  options: {
    tempDirectory?: string;
    now?: Date;
    staleAfterMs?: number;
  } = {}
): Promise<WindowsUpdateTransactionSnapshot | null> {
  const tempDirectory = options.tempDirectory ?? getCurrentTempDirectory();
  let fileNames: string[];

  try {
    fileNames = await readdir(tempDirectory);
  } catch {
    return null;
  }

  const snapshots: WindowsUpdateTransactionSnapshot[] = [];
  await Promise.all(
    fileNames.map(async (fileName) => {
      const match = updateTransactionFilePattern.exec(fileName);
      if (!match) {
        return;
      }

      const transactionPath = path.join(tempDirectory, fileName);
      const state = await readWindowsUpdateTransaction(transactionPath);
      if (!state) {
        return;
      }

      snapshots.push(createWindowsUpdateTransactionSnapshot(state, transactionPath, options));
    })
  );

  snapshots.sort((left, right) => getTransactionUpdatedAtMs(right) - getTransactionUpdatedAtMs(left));
  return snapshots[0] ?? null;
}

async function getUpdateTransactionById(
  transactionId: string,
  options: {
    tempDirectory?: string;
    now?: Date;
    staleAfterMs?: number;
  } = {}
) {
  const normalizedId = transactionId.trim();
  if (!normalizedId) {
    return null;
  }

  const tempDirectory = options.tempDirectory ?? getCurrentTempDirectory();
  const transactionPath = path.join(tempDirectory, `QuickTranslateUpdateTransaction-${normalizedId}.json`);
  const state = await readWindowsUpdateTransaction(transactionPath);
  return state ? createWindowsUpdateTransactionSnapshot(state, transactionPath, options) : null;
}

export function isFailedUpdateTransaction(transaction: WindowsUpdateTransactionState) {
  return transaction.status === 'failed';
}

export function isStaleUpdateTransaction(
  transaction: WindowsUpdateTransactionState,
  options: {
    now?: Date;
    staleAfterMs?: number;
  } = {}
) {
  if (isFinishedUpdateTransaction(transaction) || isFailedUpdateTransaction(transaction)) {
    return false;
  }

  const updatedAtMs = Date.parse(transaction.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return true;
  }

  return (options.now ?? new Date()).getTime() - updatedAtMs > (options.staleAfterMs ?? staleUpdateTransactionMs);
}

export function isRecoverableUpdateTransaction(
  transaction: WindowsUpdateTransactionState,
  options: {
    now?: Date;
    staleAfterMs?: number;
  } = {}
) {
  return Boolean(transaction.installerPath.trim()) && (isFailedUpdateTransaction(transaction) || isStaleUpdateTransaction(transaction, options));
}

export async function markLatestInstallerStartedTransactionDone(
  options: {
    tempDirectory?: string;
    currentVersion?: string;
    now?: Date;
    staleAfterMs?: number;
  } = {}
) {
  const latestTransaction = await getLatestUpdateTransaction(options);
  if (!latestTransaction || latestTransaction.status !== 'installer-started') {
    return latestTransaction;
  }

  const versionSuffix = options.currentVersion?.trim() ? ` ${options.currentVersion.trim()}` : '';
  const doneState: WindowsUpdateTransactionState = {
    ...pickWindowsUpdateTransactionState(latestTransaction),
    status: 'done',
    percent: 100,
    message: `已安装并启动新版本${versionSuffix}`,
    updatedAt: (options.now ?? new Date()).toISOString()
  };
  await writeWindowsUpdateTransaction(latestTransaction.transactionPath, doneState);

  return createWindowsUpdateTransactionSnapshot(doneState, latestTransaction.transactionPath, options);
}

export async function retryUpdateTransaction(
  options: {
    transaction?: WindowsUpdateTransactionSnapshot;
    transactionId?: string;
    tempDirectory?: string;
    currentProcessId?: number;
    now?: Date;
    staleAfterMs?: number;
    openInstaller?: (filePath: string, launchOptions: WindowsInstallerLaunchOptions) => void | Promise<void>;
  } = {}
) {
  const transaction =
    options.transaction ??
    (options.transactionId ? await getUpdateTransactionById(options.transactionId, options) : await getLatestUpdateTransaction(options));
  if (!transaction) {
    throw new Error('没有可重试的更新事务');
  }

  if (!isRecoverableUpdateTransaction(transaction, options)) {
    throw new Error('当前更新事务不可重试');
  }

  const tempDirectory = options.tempDirectory ?? path.dirname(transaction.transactionPath);
  await (options.openInstaller ?? openInstallerBeforeAppQuit)(transaction.installerPath, {
    installDirectory: transaction.installDirectory,
    currentProcessId: options.currentProcessId ?? process.pid,
    tempDirectory
  });

  return (await getLatestUpdateTransaction({ ...options, tempDirectory })) ?? transaction;
}

export async function openUpdateTransactionLogDirectory(
  options: {
    transactionId?: string;
    tempDirectory?: string;
    shellOpenPath?: (filePath: string) => Promise<string>;
  } = {}
) {
  const latestTransaction = options.transactionId
    ? await getUpdateTransactionById(options.transactionId, options)
    : await getLatestUpdateTransaction(options);
  if (options.transactionId && !latestTransaction) {
    return false;
  }

  const logDirectory = latestTransaction?.logDirectory ?? options.tempDirectory ?? getCurrentTempDirectory();
  await mkdir(logDirectory, { recursive: true });
  const errorMessage = await (options.shellOpenPath ?? shell.openPath)(logDirectory);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return true;
}

async function readWindowsUpdateTransaction(transactionPath: string) {
  try {
    const text = await readFile(transactionPath, 'utf8');
    return parseWindowsUpdateTransaction(text);
  } catch {
    return null;
  }
}

function parseWindowsUpdateTransaction(text: string): WindowsUpdateTransactionState | null {
  try {
    const value = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const id = stringOrUndefined(record.id);
    const installerPath = stringOrUndefined(record.installerPath);
    const status = stringOrUndefined(record.status);
    const message = stringOrUndefined(record.message);
    const updatedAt = stringOrUndefined(record.updatedAt);
    const currentProcessId = numberOrUndefined(record.currentProcessId);

    if (!id || !installerPath || !status || !isWindowsUpdateTransactionStatus(status) || !message || !updatedAt || !currentProcessId) {
      return null;
    }

    return {
      id,
      installerPath,
      installDirectory: stringOrUndefined(record.installDirectory),
      currentProcessId,
      status,
      percent: clampPercent(numberOrUndefined(record.percent) ?? 0),
      message,
      updatedAt
    };
  } catch {
    return null;
  }
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function createWindowsUpdateTransactionSnapshot(
  state: WindowsUpdateTransactionState,
  transactionPath: string,
  options: {
    now?: Date;
    staleAfterMs?: number;
  } = {}
): WindowsUpdateTransactionSnapshot {
  const failed = isFailedUpdateTransaction(state);
  const stale = isStaleUpdateTransaction(state, options);

  return {
    ...state,
    transactionPath,
    logPath: getWindowsUpdateLogPath(transactionPath, state.id),
    logDirectory: path.dirname(transactionPath),
    failed,
    stale,
    recoverable: Boolean(state.installerPath.trim()) && (failed || stale)
  };
}

function getWindowsUpdateLogPath(transactionPath: string, id: string) {
  return path.join(path.dirname(transactionPath), `QuickTranslateUpdateLauncher-${id}.log`);
}

function getTransactionUpdatedAtMs(transaction: WindowsUpdateTransactionState) {
  const updatedAtMs = Date.parse(transaction.updatedAt);
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
}

function isFinishedUpdateTransaction(transaction: WindowsUpdateTransactionState) {
  return transaction.status === 'done' || transaction.status === 'installed';
}

function isWindowsUpdateTransactionStatus(status: string): status is WindowsUpdateTransactionStatus {
  return (
    status === 'waiting-app-exit' ||
    status === 'cleaning-processes' ||
    status === 'launching-installer' ||
    status === 'installer-started' ||
    status === 'failed' ||
    status === 'done' ||
    status === 'installed'
  );
}

function pickWindowsUpdateTransactionState(transaction: WindowsUpdateTransactionState): WindowsUpdateTransactionState {
  return {
    id: transaction.id,
    installerPath: transaction.installerPath,
    installDirectory: transaction.installDirectory,
    currentProcessId: transaction.currentProcessId,
    status: transaction.status,
    percent: transaction.percent,
    message: transaction.message,
    updatedAt: transaction.updatedAt
  };
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
