import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { openInstallerBeforeAppQuit } from './autoUpdate';

const execFileAsync = promisify(execFile);
const launchedNotepadPids = new Set<number>();
const describeHandoffIntegration =
  process.platform === 'win32' && process.env.RUN_DESKTOP_UPDATE_HANDOFF_INTEGRATION === '1' ? describe : describe.skip;

describeHandoffIntegration('desktop update handoff integration', () => {
  afterEach(async () => {
    await Promise.all(
      [...launchedNotepadPids].map(async (pid) => {
        await execFileAsync('taskkill.exe', ['/PID', String(pid), '/F']).catch(() => undefined);
      })
    );
    launchedNotepadPids.clear();
  });

  it('starts the handoff target after the old app process exits', async () => {
    const tempDirectory = await mkdtemp(path.join(getUserTempDirectory(), '快捷翻译更新交接-'));
    const coordinatorPath = path.join(process.cwd(), 'build', 'update-helper', 'QuickTranslateUpdateCoordinator.exe');
    if (!existsSync(coordinatorPath)) {
      throw new Error('缺少更新协调器，请先运行 node scripts/build-update-coordinator.mjs');
    }
    const beforePids = await getNotepadPids();
    const oldProcess = spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Sleep -Milliseconds 1200'], {
      stdio: 'ignore',
      windowsHide: true
    });

    try {
      expect(oldProcess.pid).toBeGreaterThan(0);
      await openInstallerBeforeAppQuit('C:\\Windows\\System32\\notepad.exe', {
        platform: 'win32',
        currentProcessId: oldProcess.pid,
        tempDirectory,
        updateCoordinatorPath: coordinatorPath
      });

      const launchedPid = await waitForNewNotepadPid(beforePids);
      launchedNotepadPids.add(launchedPid);
      const logPath = path.join(tempDirectory, `QuickTranslateUpdateLauncher-${oldProcess.pid}.log`);
      await expect(readFile(logPath, 'utf8')).resolves.toContain('installer start requested');
    } finally {
      oldProcess.kill();
      if (!process.env.KEEP_QUICK_TRANSLATE_HANDOFF_TEST_FILES) {
        await rm(tempDirectory, { recursive: true, force: true });
      }
    }
  }, 15000);
});

async function waitForNewNotepadPid(existingPids: Set<number>) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    const pids = await getNotepadPids();
    const newPid = [...pids].find((pid) => !existingPids.has(pid));
    if (newPid) {
      return newPid;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for update handoff target process');
}

function getUserTempDirectory() {
  return process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp') : process.env.TEMP || 'C:\\Windows\\Temp';
}

async function getNotepadPids() {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "$processes = Get-Process notepad -ErrorAction SilentlyContinue; if ($processes) { $processes | Select-Object -ExpandProperty Id }; exit 0"
  ]);

  return new Set(
    stdout
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
  );
}
