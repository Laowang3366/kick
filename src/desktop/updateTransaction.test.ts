import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLatestUpdateTransaction,
  isFailedUpdateTransaction,
  isRecoverableUpdateTransaction,
  isStaleUpdateTransaction,
  markLatestInstallerStartedTransactionDone,
  pruneWindowsUpdateTransactionArtifacts,
  retryUpdateTransaction,
  type WindowsUpdateTransactionState
} from './autoUpdate';

const tempDirectories: string[] = [];

describe('desktop update transactions', () => {
  afterEach(async () => {
    await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it('reads the latest update transaction from the temp directory', async () => {
    const tempDirectory = await createTempDirectory();
    await writeTransaction(tempDirectory, {
      id: '111',
      installerPath: 'C:\\Temp\\Quick-Translate-0.1.64.exe',
      currentProcessId: 111,
      status: 'failed',
      percent: 100,
      message: '安装器启动失败',
      updatedAt: '2026-05-12T00:00:00.000Z'
    });
    await writeTransaction(tempDirectory, {
      id: '222',
      installerPath: 'C:\\Temp\\Quick-Translate-0.1.65.exe',
      installDirectory: 'D:\\Apps\\快捷翻译',
      currentProcessId: 222,
      status: 'installer-started',
      percent: 100,
      message: '安装器已启动',
      updatedAt: '2026-05-12T00:01:00.000Z'
    });

    await expect(getLatestUpdateTransaction({ tempDirectory })).resolves.toMatchObject({
      id: '222',
      installerPath: 'C:\\Temp\\Quick-Translate-0.1.65.exe',
      installDirectory: 'D:\\Apps\\快捷翻译',
      transactionPath: path.join(tempDirectory, 'QuickTranslateUpdateTransaction-222.json'),
      logPath: path.join(tempDirectory, 'QuickTranslateUpdateLauncher-222.log'),
      logDirectory: tempDirectory
    });
  });

  it('identifies failed and stale transactions as recoverable', () => {
    const failedTransaction = createTransaction({
      status: 'failed',
      updatedAt: '2026-05-12T00:10:00.000Z'
    });
    const staleTransaction = createTransaction({
      status: 'launching-installer',
      updatedAt: '2026-05-12T00:00:00.000Z'
    });
    const activeTransaction = createTransaction({
      status: 'launching-installer',
      updatedAt: '2026-05-12T00:09:30.000Z'
    });
    const now = new Date('2026-05-12T00:10:00.000Z');

    expect(isFailedUpdateTransaction(failedTransaction)).toBe(true);
    expect(isRecoverableUpdateTransaction(failedTransaction, { now })).toBe(true);
    expect(isStaleUpdateTransaction(staleTransaction, { now, staleAfterMs: 60_000 })).toBe(true);
    expect(isRecoverableUpdateTransaction(staleTransaction, { now, staleAfterMs: 60_000 })).toBe(true);
    expect(isRecoverableUpdateTransaction(activeTransaction, { now, staleAfterMs: 60_000 })).toBe(false);
  });

  it('retries a recoverable transaction through the installer handoff', async () => {
    const tempDirectory = await createTempDirectory();
    await writeTransaction(tempDirectory, {
      id: '333',
      installerPath: 'C:\\Temp\\Quick-Translate-0.1.65.exe',
      installDirectory: 'D:\\Apps\\快捷翻译',
      currentProcessId: 333,
      status: 'failed',
      percent: 100,
      message: '安装器启动失败',
      updatedAt: '2026-05-12T00:01:00.000Z'
    });
    const openInstaller = vi.fn();

    await retryUpdateTransaction({
      transactionId: '333',
      tempDirectory,
      currentProcessId: 444,
      openInstaller
    });

    expect(openInstaller).toHaveBeenCalledWith('C:\\Temp\\Quick-Translate-0.1.65.exe', {
      installDirectory: 'D:\\Apps\\快捷翻译',
      currentProcessId: 444,
      tempDirectory,
      allowDirectInstallerFallback: true
    });
  });

  it('marks the latest started installer transaction as done after the app starts', async () => {
    const tempDirectory = await createTempDirectory();
    await writeTransaction(tempDirectory, {
      id: '555',
      installerPath: 'C:\\Temp\\Quick-Translate-0.1.65.exe',
      currentProcessId: 555,
      status: 'installer-started',
      percent: 100,
      message: '安装器已启动',
      updatedAt: '2026-05-12T00:01:00.000Z'
    });

    await expect(
      markLatestInstallerStartedTransactionDone({
        tempDirectory,
        currentVersion: '0.1.65',
        now: new Date('2026-05-12T00:02:00.000Z')
      })
    ).resolves.toMatchObject({
      id: '555',
      status: 'done',
      recoverable: false
    });
    await expect(readTransaction(tempDirectory, '555')).resolves.toMatchObject({
      status: 'done',
      message: '已安装并启动新版本 0.1.65',
      updatedAt: '2026-05-12T00:02:00.000Z'
    });
  });

  it('prunes old transaction files and orphan launcher logs while preserving active and recent recoverable transactions', async () => {
    const tempDirectory = await createTempDirectory();
    await writeTransactionWithLog(tempDirectory, {
      id: '100',
      status: 'failed',
      updatedAt: '2026-05-12T00:00:00.000Z'
    });
    await writeTransactionWithLog(tempDirectory, {
      id: '200',
      status: 'failed',
      updatedAt: '2026-05-12T00:01:00.000Z'
    });
    await writeTransactionWithLog(tempDirectory, {
      id: '300',
      status: 'failed',
      updatedAt: '2026-05-12T00:02:00.000Z'
    });
    await writeTransactionWithLog(tempDirectory, {
      id: '400',
      status: 'waiting-app-exit',
      updatedAt: '2026-05-12T00:03:00.000Z'
    });
    await writeFile(path.join(tempDirectory, 'QuickTranslateUpdateLauncher-orphan.log'), 'orphan', 'utf8');

    await expect(
      pruneWindowsUpdateTransactionArtifacts(tempDirectory, {
        preserveTransactionIds: ['400'],
        now: new Date('2026-05-12T00:03:10.000Z')
      })
    ).resolves.toMatchObject({
      directory: tempDirectory,
      deletedCount: 3
    });

    await expect(readdir(tempDirectory)).resolves.toEqual(
      expect.arrayContaining([
        'QuickTranslateUpdateTransaction-200.json',
        'QuickTranslateUpdateLauncher-200.log',
        'QuickTranslateUpdateTransaction-300.json',
        'QuickTranslateUpdateLauncher-300.log',
        'QuickTranslateUpdateTransaction-400.json',
        'QuickTranslateUpdateLauncher-400.log'
      ])
    );
    await expect(readFile(path.join(tempDirectory, 'QuickTranslateUpdateTransaction-100.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(tempDirectory, 'QuickTranslateUpdateLauncher-100.log'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(tempDirectory, 'QuickTranslateUpdateLauncher-orphan.log'), 'utf8')).rejects.toThrow();
  });
});

async function createTempDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'quick-translate-update-transaction-'));
  tempDirectories.push(directory);
  return directory;
}

function createTransaction(patch: Partial<WindowsUpdateTransactionState> = {}): WindowsUpdateTransactionState {
  return {
    id: '100',
    installerPath: 'C:\\Temp\\Quick-Translate-0.1.65.exe',
    currentProcessId: 100,
    status: 'waiting-app-exit',
    percent: 10,
    message: '正在等待旧版本退出',
    updatedAt: '2026-05-12T00:00:00.000Z',
    ...patch
  };
}

async function writeTransaction(tempDirectory: string, transaction: WindowsUpdateTransactionState) {
  await writeFile(
    path.join(tempDirectory, `QuickTranslateUpdateTransaction-${transaction.id}.json`),
    `${JSON.stringify(transaction, null, 2)}\n`,
    'utf8'
  );
}

async function writeTransactionWithLog(
  tempDirectory: string,
  patch: Partial<WindowsUpdateTransactionState> & { id: string }
) {
  const transaction = createTransaction({
    currentProcessId: Number(patch.id),
    ...patch
  });
  await writeTransaction(tempDirectory, transaction);
  await writeFile(path.join(tempDirectory, `QuickTranslateUpdateLauncher-${transaction.id}.log`), 'log', 'utf8');
}

async function readTransaction(tempDirectory: string, id: string) {
  return JSON.parse(await readFile(path.join(tempDirectory, `QuickTranslateUpdateTransaction-${id}.json`), 'utf8'));
}
