import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, link, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { defaultQuickTranslateBackendBaseUrl, normalizeBackendBaseUrl } from '../shared/cloudEndpoint.js';
import {
  getDefaultUpdatePackageDirectory,
  normalizeUpdatePackageDirectoryPath,
  pruneUpdatePackageArtifacts
} from './updatePackageDirectory.js';
import {
  compareRetentionItemsByUpdatedAtDescending,
  defaultUpdateArtifactRetentionCount
} from './updateTransaction.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as PackageJsonWithPublishConfig;

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
  updateFailureReportToken?: string;
  updateFailureReportBaseUrl?: string;
  reportUpdateFailure?: (input: WindowsUpdateFailureReportInput) => void | Promise<void>;
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
  allowPowerShellFallback?: boolean;
};

type PackageJsonWithPublishConfig = {
  build?: {
    publish?: Array<{
      provider?: string;
      url?: string;
    }>;
  };
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
  coordinatorPath?: string;
  failureCode?: string;
  installerExitHint?: string;
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

export type WindowsUpdateFailureReportInput = {
  appVersion: string;
  platform: NodeJS.Platform;
  failureReason: string;
  error?: string;
};

const updateCheckDelayMs = 8000;
const quickTranslateMachineInstallRegistryKey = 'HKLM\\Software\\c747ef85-e8bd-5ddf-bf80-1c3355114152';
const quickTranslateMachineUninstallRegistryKey =
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\c747ef85-e8bd-5ddf-bf80-1c3355114152';
const staleUpdateTransactionMs = 10 * 60 * 1000;
const updateTransactionFilePattern = /^QuickTranslateUpdateTransaction-(.+)\.json$/;
const updateLauncherLogFilePattern = /^QuickTranslateUpdateLauncher-(.+)\.log$/;
const defaultUpdateFailureReportToken = 'quick-translate-update-report-v1';

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
    await reportWindowsUpdateFailure({
      ...options,
      failureReason: 'desktop-update-error',
      error: message
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
              installDirectory: getProductionInstallDirectory(),
              currentProcessId: process.pid,
              tempDirectory: getCurrentTempDirectory(),
              allowPowerShellFallback: true
            })
        : openInstallerDetached,
    quitAfterOpenDownloadedUpdate: process.platform === 'win32' ? scheduleQuitAfterOpeningInstaller : undefined,
    updateFailureReportToken: process.env.QUICK_TRANSLATE_UPDATE_REPORT_TOKEN ?? defaultUpdateFailureReportToken,
    updateFailureReportBaseUrl: resolveUpdateFailureReportBaseUrl(process.env)
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

  await launchInstallerAfterCurrentProcessExit(filePath, options);
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

async function launchInstallerAfterCurrentProcessExit(filePath: string, options: WindowsInstallerLaunchOptions) {
  const currentProcessId = options.currentProcessId ?? process.pid;
  const tempDirectory = options.tempDirectory ?? getCurrentTempDirectory();
  const logPath = path.join(tempDirectory, `QuickTranslateUpdateLauncher-${currentProcessId}.log`);
  const transactionPath = path.join(tempDirectory, `QuickTranslateUpdateTransaction-${currentProcessId}.json`);
  const installerArgs = getWindowsInstallerArgs(options.installDirectory, transactionPath);
  const coordinatorPath = options.updateCoordinatorPath ?? getPackagedWindowsUpdateCoordinatorPath();
  await mkdir(tempDirectory, { recursive: true });
  await writeWindowsUpdateTransaction(transactionPath, {
    id: String(currentProcessId),
    installerPath: filePath,
    installDirectory: options.installDirectory,
    coordinatorPath,
    currentProcessId,
    status: 'waiting-app-exit',
    percent: 10,
    message: '正在等待旧版本退出',
    updatedAt: new Date().toISOString()
  });
  await pruneWindowsUpdateTransactionArtifacts(tempDirectory, {
    preserveTransactionIds: [String(currentProcessId)]
  });

  if (coordinatorPath && existsSync(coordinatorPath)) {
    const coordinatorArgs = createWindowsUpdateCoordinatorArgs({
      filePath,
      workingDirectory: path.dirname(filePath),
      currentProcessId,
      logPath,
      transactionPath,
      installDirectory: options.installDirectory,
      installerArgs
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

  if (!options.allowPowerShellFallback) {
    const message = coordinatorPath
      ? '更新协调器缺失，无法启动安装器。请重新下载安装包后再更新。'
      : '未找到更新协调器，无法启动安装器。请重新下载安装包后再更新。';
    await writeWindowsUpdateTransaction(transactionPath, {
      id: String(currentProcessId),
      installerPath: filePath,
      installDirectory: options.installDirectory,
      coordinatorPath,
      currentProcessId,
      status: 'failed',
      percent: 100,
      message,
      failureCode: 'update-coordinator-missing',
      installerExitHint: '重新下载最新安装包后手动运行安装。',
      updatedAt: new Date().toISOString()
    });
    await pruneWindowsUpdateTransactionArtifacts(tempDirectory, {
      preserveTransactionIds: [String(currentProcessId)]
    });
    throw new Error(message);
  }

  const launcherScriptPath = path.join(tempDirectory, `QuickTranslateUpdateLauncher-${currentProcessId}.ps1`);
  await writeWindowsUpdateTransaction(transactionPath, {
    id: String(currentProcessId),
    installerPath: filePath,
    installDirectory: options.installDirectory,
    coordinatorPath,
    currentProcessId,
    status: 'waiting-app-exit',
    percent: 12,
    message: '更新协调器缺失，正在使用备用启动器',
    failureCode: 'coordinator-missing-fallback-started',
    installerExitHint: '备用启动器会在旧版本退出后打开安装器。',
    updatedAt: new Date().toISOString()
  });
  await writeFile(launcherScriptPath, `\ufeff${windowsUpdateLauncherScript}`, 'utf8');
  await pruneWindowsUpdateTransactionArtifacts(tempDirectory, {
    preserveTransactionIds: [String(currentProcessId)]
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

  let child: InstallerLauncherProcess;
  try {
    child = (options.launcher ?? spawn)(
      getWindowsCmdPath(),
      ['/d', '/s', '/c', 'start', '""', getWindowsPowerShellPath(), ...powershellArgs],
      {
        cwd: tempDirectory,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    );
  } catch (error) {
    const message = `备用启动器启动失败：${error instanceof Error ? error.message : String(error)}`;
    await writeWindowsUpdateTransaction(transactionPath, {
      id: String(currentProcessId),
      installerPath: filePath,
      installDirectory: options.installDirectory,
      coordinatorPath,
      currentProcessId,
      status: 'failed',
      percent: 100,
      message,
      failureCode: 'fallback-start-failed',
      installerExitHint: '请手动运行已下载的安装包，或重新下载最新安装包。',
      updatedAt: new Date().toISOString()
    });
    await pruneWindowsUpdateTransactionArtifacts(tempDirectory, {
      preserveTransactionIds: [String(currentProcessId)]
    });
    throw new Error(message);
  }
  child.unref();
}

function createWindowsUpdateCoordinatorArgs(input: {
  filePath: string;
  workingDirectory: string;
  currentProcessId: number;
  logPath: string;
  transactionPath: string;
  installDirectory?: string;
  installerArgs?: string[];
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

  for (const installerArg of input.installerArgs ?? []) {
    if (installerArg.trim()) {
      args.push('--installer-arg', installerArg.trim());
    }
  }

  return args;
}

function getPackagedWindowsUpdateCoordinatorPath() {
  if (!app?.isPackaged) {
    return undefined;
  }

  const candidates = getWindowsUpdateCoordinatorPathCandidates();
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function getWindowsUpdateCoordinatorPathCandidates() {
  const candidates = new Set<string>();
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    candidates.add(path.join(resourcesPath, 'update-helper', 'QuickTranslateUpdateCoordinator.exe'));
  }

  try {
    candidates.add(path.join(path.dirname(app.getAppPath()), 'update-helper', 'QuickTranslateUpdateCoordinator.exe'));
  } catch {
    // Keep process.execPath as a reliable packaged fallback.
  }

  candidates.add(path.join(path.dirname(process.execPath), 'resources', 'update-helper', 'QuickTranslateUpdateCoordinator.exe'));
  return [...candidates];
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
  await pruneWindowsUpdateTransactionArtifacts(path.dirname(latestTransaction.transactionPath), {
    preserveTransactionIds: [latestTransaction.id],
    now: options.now,
    staleAfterMs: options.staleAfterMs
  });

  return createWindowsUpdateTransactionSnapshot(doneState, latestTransaction.transactionPath, options);
}

export async function pruneWindowsUpdateTransactionArtifacts(
  tempDirectory: string = getCurrentTempDirectory(),
  options: {
    keepRecoverableTransactions?: number;
    keepLatestTransactions?: number;
    preserveTransactionIds?: string[];
    now?: Date;
    staleAfterMs?: number;
  } = {}
) {
  let fileNames: string[];

  try {
    fileNames = await readdir(tempDirectory);
  } catch {
    return { directory: tempDirectory, deletedCount: 0 };
  }

  const preservedTransactionIds = new Set((options.preserveTransactionIds ?? []).map((id) => id.trim()).filter(Boolean));
  const fileNameSet = new Set(fileNames);
  const transactionCandidates = await Promise.all(
    fileNames.map(async (fileName) => {
      const match = updateTransactionFilePattern.exec(fileName);
      if (!match) {
        return null;
      }

      const transactionPath = path.join(tempDirectory, fileName);
      const state = await readWindowsUpdateTransaction(transactionPath);
      const id = state?.id ?? match[1];
      return {
        id,
        transactionPath,
        logPath: getWindowsUpdateLogPath(transactionPath, id),
        updatedAt: state?.updatedAt,
        recoverable: state ? isRecoverableUpdateTransaction(state, options) : false,
        preserve: preservedTransactionIds.has(id)
      };
    })
  );
  const candidates = transactionCandidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  const recoverableRetainedIds = new Set(
    candidates
      .filter((candidate) => candidate.recoverable)
      .sort(compareRetentionItemsByUpdatedAtDescending)
      .slice(0, options.keepRecoverableTransactions ?? defaultUpdateArtifactRetentionCount)
      .map((candidate) => candidate.id)
  );
  const latestRetainedIds = new Set(
    candidates
      .sort(compareRetentionItemsByUpdatedAtDescending)
      .slice(0, options.keepLatestTransactions ?? 1)
      .map((candidate) => candidate.id)
  );
  const retainedIds = new Set([...preservedTransactionIds, ...recoverableRetainedIds, ...latestRetainedIds]);
  const deletedPaths = new Set<string>();
  let deletedCount = 0;

  for (const candidate of candidates) {
    if (retainedIds.has(candidate.id)) {
      continue;
    }

    await rm(candidate.transactionPath, { force: true });
    deletedPaths.add(path.resolve(candidate.transactionPath).toLowerCase());
    deletedCount += 1;

    if (fileNameSet.has(path.basename(candidate.logPath))) {
      await rm(candidate.logPath, { force: true });
      deletedPaths.add(path.resolve(candidate.logPath).toLowerCase());
      deletedCount += 1;
    }
  }

  await Promise.all(
    fileNames.map(async (fileName) => {
      const match = updateLauncherLogFilePattern.exec(fileName);
      if (!match || retainedIds.has(match[1])) {
        return;
      }

      const logPath = path.join(tempDirectory, fileName);
      if (deletedPaths.has(path.resolve(logPath).toLowerCase())) {
        return;
      }

      await rm(logPath, { force: true });
      deletedCount += 1;
    })
  );

  return {
    directory: tempDirectory,
    deletedCount
  };
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
    tempDirectory,
    allowPowerShellFallback: true
  });

  return (await getLatestUpdateTransaction({ ...options, tempDirectory })) ?? transaction;
}

export async function uploadLatestWindowsUpdateFailureReport(
  input: WindowsUpdateFailureReportInput,
  options: {
    token?: string;
    baseUrl?: string;
    fetcher?: typeof fetch;
    tempDirectory?: string;
    now?: Date;
    staleAfterMs?: number;
    timeoutMs?: number;
  } = {}
) {
  const token = options.token?.trim();
  if (!token || input.platform !== 'win32') {
    return false;
  }

  const transaction = await getLatestUpdateTransaction(options);
  if (!transaction || (!transaction.failed && !transaction.stale && !transaction.recoverable)) {
    return false;
  }

  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), normalizeReportTimeout(options.timeoutMs));

  try {
    const response = await fetcher(
      `${normalizeBackendBaseUrl(options.baseUrl ?? defaultQuickTranslateBackendBaseUrl)}/api/update-failure-reports`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          source: 'desktop-windows-update',
          appVersion: input.appVersion,
          platform: input.platform,
          failureReason: input.failureReason,
          error: input.error,
          transaction: pickWindowsUpdateFailureTransaction(transaction),
          logSummary: await readWindowsUpdateLogSummary(transaction.logPath)
        }),
        signal: controller.signal
      }
    );

    return response.ok;
  } finally {
    clearTimeout(timeoutId);
  }
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
      coordinatorPath: stringOrUndefined(record.coordinatorPath),
      failureCode: stringOrUndefined(record.failureCode),
      installerExitHint: stringOrUndefined(record.installerExitHint),
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
    coordinatorPath: transaction.coordinatorPath,
    failureCode: transaction.failureCode,
    installerExitHint: transaction.installerExitHint,
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

function getWindowsInstallerArgs(installDirectory: string | undefined, transactionPath: string) {
  const normalizedInstallDirectory = installDirectory?.trim();
  const args = [`/QUICK_TRANSLATE_TRANSACTION=${transactionPath}`];
  if (normalizedInstallDirectory) {
    args.push(`/D=${normalizedInstallDirectory}`);
  }
  return args;
}

function getCurrentInstallDirectory() {
  try {
    return path.dirname(app.getPath('exe'));
  } catch {
    return path.dirname(process.execPath);
  }
}

export function getProductionInstallDirectory(
  options: { platform?: NodeJS.Platform; execFile?: typeof execFileSync; currentInstallDirectory?: string } = {}
) {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') {
    return options.currentInstallDirectory ?? getCurrentInstallDirectory();
  }

  return (
    readWindowsRegistryString(quickTranslateMachineInstallRegistryKey, 'InstallLocation', options.execFile) ??
    readWindowsRegistryString(quickTranslateMachineUninstallRegistryKey, 'InstallLocation', options.execFile) ??
    getCurrentMachineInstallDirectory(options.currentInstallDirectory)
  );
}

function getCurrentMachineInstallDirectory(currentInstallDirectory?: string) {
  const installDirectory = currentInstallDirectory ?? getCurrentInstallDirectory();
  return isCurrentUserInstallDirectory(installDirectory) ? undefined : installDirectory;
}

function isCurrentUserInstallDirectory(installDirectory: string) {
  const normalized = normalizeWindowsPath(installDirectory);
  return normalized.includes('\\appdata\\local\\programs\\quick-translate');
}

function readWindowsRegistryString(registryKey: string, valueName: string, execFile: typeof execFileSync = execFileSync) {
  try {
    const output = execFile('reg.exe', ['query', registryKey, '/v', valueName], {
      encoding: 'utf8',
      windowsHide: true
    });
    const match = output.match(new RegExp(`\\s${escapeRegExp(valueName)}\\s+REG_\\w+\\s+(.+)`));
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function reportWindowsUpdateFailure(
  options: Pick<
    CheckForUpdatesOptions,
    | 'currentVersion'
    | 'platform'
    | 'logger'
    | 'updateFailureReportToken'
    | 'updateFailureReportBaseUrl'
    | 'reportUpdateFailure'
  > & {
    failureReason: string;
    error?: string;
  }
) {
  if (options.platform !== 'win32') {
    return;
  }

  const input = {
    appVersion: options.currentVersion,
    platform: options.platform,
    failureReason: options.failureReason,
    error: options.error
  };

  try {
    if (options.reportUpdateFailure) {
      await options.reportUpdateFailure(input);
      return;
    }

    await uploadLatestWindowsUpdateFailureReport(input, {
      token: options.updateFailureReportToken,
      baseUrl: options.updateFailureReportBaseUrl
    });
  } catch (reportError) {
    const message = reportError instanceof Error ? reportError.message : String(reportError);
    options.logger?.warn(`[自动更新] 上报失败日志失败：${message}`);
  }
}

function pickWindowsUpdateFailureTransaction(transaction: WindowsUpdateTransactionSnapshot) {
  return {
    id: transaction.id,
    status: transaction.status,
    message: transaction.message,
    failureCode: transaction.failureCode,
    installerExitHint: transaction.installerExitHint,
    installerPath: transaction.installerPath,
    installDirectory: transaction.installDirectory,
    coordinatorPath: transaction.coordinatorPath,
    currentProcessId: transaction.currentProcessId,
    percent: transaction.percent,
    updatedAt: transaction.updatedAt,
    failed: transaction.failed,
    stale: transaction.stale,
    recoverable: transaction.recoverable
  };
}

async function readWindowsUpdateLogSummary(logPath: string) {
  try {
    return tailText(await readFile(logPath, 'utf8'), 12_000);
  } catch {
    return '';
  }
}

function tailText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function normalizeReportTimeout(value: number | undefined) {
  return Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : 10_000;
}

function resolveUpdateFailureReportBaseUrl(env: Record<string, string | undefined>) {
  return normalizeBackendBaseUrl(env.QUICK_TRANSLATE_BACKEND_URL ?? env.VITE_QUICK_TRANSLATE_API_URL ?? defaultQuickTranslateBackendBaseUrl);
}

function normalizeWindowsPath(value: string) {
  return path.win32.normalize(value).replace(/[\\/]+$/, '').toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

export function getDesktopUpdateFeedUrl(inputPackageJson: PackageJsonWithPublishConfig = packageJson) {
  const publishEntries = Array.isArray(inputPackageJson?.build?.publish) ? inputPackageJson.build.publish : [];
  const genericEntry = publishEntries.find((entry) => entry?.provider === 'generic');
  if (!genericEntry?.url) {
    throw new Error('缺少 build.publish generic 更新源配置');
  }
  return genericEntry.url;
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
    foreach ($name in $names) {
      & "$env:SystemRoot\System32\taskkill.exe" /T /F /IM $name | Out-Null
    }
  } catch {
    Write-QuickTranslateUpdateLog ("cleanup warning: " + $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 500
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
  $env:QUICK_TRANSLATE_UPDATE_TRANSACTION = $TransactionPath
  $env:QUICK_TRANSLATE_UPDATE_PROCESS_ID = [string]$CurrentProcessId
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
      url: getDesktopUpdateFeedUrl()
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
  await pruneUpdatePackageArtifacts(targetDirectory, {
    preservePaths: [targetPath]
  });
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
