import { execFileSync, spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const devServerUrl = 'http://127.0.0.1:5173/';
let vite;

try {
  if (!(await canFetch(devServerUrl))) {
    vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    vite.stdout.on('data', (chunk) => process.stdout.write(`[Vite] ${chunk}`));
    vite.stderr.on('data', (chunk) => process.stderr.write(`[Vite] ${chunk}`));
    await waitForUrl(devServerUrl, 20_000);
  }

  await runElectronSmoke();
  console.log('[桌面冒烟] Electron 启动冒烟通过');
} catch (error) {
  console.error(`[桌面冒烟] 失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  terminateProcessTree(vite);
}

async function canFetch(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling while Vite starts.
    }

    await delay(300);
  }

  throw new Error(`开发服务未在 ${timeoutMs}ms 内启动：${url}`);
}

function runElectronSmoke() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'node_modules/.bin/electron';
    const args =
      process.platform === 'win32' ? ['/c', 'node_modules\\.bin\\electron.cmd', '.', '--smoke-test'] : ['.', '--smoke-test'];
    const child = spawn(command, args, {
      shell: false,
      stdio: 'inherit'
    });
    const timeout = setTimeout(() => {
      terminateProcessTree(child);
      reject(new Error('Electron 冒烟超时'));
    }, 30_000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Electron 退出码 ${code}`));
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function terminateProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    } catch {
      // Fall back to the direct child kill below.
    }
  }

  child.kill();
}
