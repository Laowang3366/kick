import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createWindowsHelperEnvironment, getWindowsHelperTempDirectory } from './windowsHelperEnvironment.js';

type CopyShortcutSenderOptions = {
  scriptPath?: string;
  spawnProcess?: typeof spawn;
  terminateProcessTree?: (pid: number) => void;
  logger?: Pick<Console, 'warn'>;
  requestTimeoutMs?: number;
};

type PendingCopyRequest = {
  id: number;
  timeout: NodeJS.Timeout;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type WindowsCopyShortcutSender = {
  warmUp(): void;
  send(): Promise<void>;
  stop(): void;
};

export function createWindowsCopyShortcutSender(options: CopyShortcutSenderOptions = {}): WindowsCopyShortcutSender {
  const scriptPath = options.scriptPath ?? path.join(getWindowsHelperTempDirectory(), 'quick-translate-copy-shortcut.ps1');
  const spawnProcess = options.spawnProcess ?? spawn;
  const terminateProcessTree = options.terminateProcessTree ?? terminateWindowsProcessTree;
  let helperProcess: ChildProcessWithoutNullStreams | null = null;
  let stdoutRemainder = '';
  let pendingRequests: PendingCopyRequest[] = [];
  let nextRequestId = 1;

  function ensureHelperProcess() {
    if (helperProcess && !helperProcess.killed) {
      return helperProcess;
    }

    mkdirSync(path.dirname(scriptPath), { recursive: true });
    writeFileSync(scriptPath, createCopyShortcutHelperScript(), 'utf8');
    helperProcess = spawnProcess(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { env: createWindowsHelperEnvironment(), windowsHide: true }
    ) as ChildProcessWithoutNullStreams;
    stdoutRemainder = '';

    helperProcess.stdout.setEncoding('utf8');
    helperProcess.stdout.on('data', (chunk: string) => {
      handleHelperOutput(chunk);
    });

    helperProcess.stderr.setEncoding('utf8');
    helperProcess.stderr.on('data', (chunk: string) => {
      options.logger?.warn(`Copy shortcut helper: ${chunk.trim()}`);
    });

    helperProcess.on('error', (error) => {
      rejectPendingRequests(error);
      options.logger?.warn(`Copy shortcut helper failed: ${error.message}`);
    });

    helperProcess.on('close', () => {
      helperProcess = null;
      rejectPendingRequests(new Error('Copy shortcut helper exited'));
    });

    return helperProcess;
  }

  function handleHelperOutput(chunk: string) {
    const combinedOutput = `${stdoutRemainder}${chunk}`;
    const lines = combinedOutput.split(/\r?\n/);
    const endsWithNewline = /\r?\n$/.test(combinedOutput);
    const completeLines = endsWithNewline ? lines.slice(0, -1) : lines.slice(0, -1);
    stdoutRemainder = endsWithNewline ? '' : (lines.at(-1) ?? '');

    for (const line of completeLines) {
      const output = line.trim();
      if (output.startsWith('DONE')) {
        resolvePendingRequest(readResponseId(output), undefined);
      } else if (output.startsWith('ERROR')) {
        resolvePendingRequest(readResponseId(output), new Error(output));
      }
    }
  }

  function readResponseId(output: string) {
    const [, id] = output.split(/\s+/, 2);
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  function resolvePendingRequest(id: number | undefined, error: unknown) {
    const index = id ? pendingRequests.findIndex((request) => request.id === id) : 0;
    if (index < 0) {
      return;
    }
    const [request] = pendingRequests.splice(index, 1);
    clearTimeout(request.timeout);
    if (error) {
      request.reject(error);
    } else {
      request.resolve();
    }
  }

  function rejectPendingRequests(error: unknown) {
    const requests = pendingRequests;
    pendingRequests = [];
    for (const request of requests) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
  }

  function restartHelperAfterTimeout() {
    rejectPendingRequests(new Error('Copy shortcut helper timed out'));
    if (typeof helperProcess?.pid === 'number') {
      terminateProcessTree(helperProcess.pid);
    }
    if (helperProcess && !helperProcess.killed) {
      helperProcess.kill();
    }
    helperProcess = null;
  }

  return {
    warmUp() {
      try {
        ensureHelperProcess();
      } catch (error) {
        options.logger?.warn(`Copy shortcut helper warm-up failed: ${String(error)}`);
      }
    },
    send() {
      return new Promise<void>((resolve, reject) => {
        const process = ensureHelperProcess();
        const id = nextRequestId;
        nextRequestId += 1;
        const timeout = setTimeout(() => {
          restartHelperAfterTimeout();
        }, options.requestTimeoutMs ?? 1500);
        timeout.unref();
        pendingRequests.push({ id, timeout, resolve, reject });
        try {
          process.stdin.write(`COPY ${id}\n`);
        } catch (error) {
          pendingRequests = pendingRequests.filter((request) => {
            if (request.id !== id) {
              return true;
            }
            clearTimeout(request.timeout);
            return false;
          });
          reject(error);
        }
      });
    },
    stop() {
      rejectPendingRequests(new Error('Copy shortcut helper stopped'));
      if (typeof helperProcess?.pid === 'number') {
        terminateProcessTree(helperProcess.pid);
      }
      if (helperProcess && !helperProcess.killed) {
        helperProcess.kill();
      }
      helperProcess = null;
    }
  };
}

function terminateWindowsProcessTree(pid: number) {
  if (process.platform !== 'win32') {
    return;
  }

  spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    windowsHide: true,
    stdio: 'ignore'
  }).unref();
}

function createCopyShortcutHelperScript() {
  return String.raw`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class QuickTranslateCopyShortcut
{
    private const byte VK_CONTROL = 0x11;
    private const byte VK_C = 0x43;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    public static void SendCopy()
    {
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        keybd_event(VK_C, 0, 0, UIntPtr.Zero);
        keybd_event(VK_C, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

while (($line = [Console]::In.ReadLine()) -ne $null) {
    $parts = $line.Trim().Split(" ", 2, [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($parts.Length -gt 0 -and $parts[0] -eq "COPY") {
        $requestId = ""
        if ($parts.Length -gt 1) {
            $requestId = " " + $parts[1]
        }
        try {
            [QuickTranslateCopyShortcut]::SendCopy()
            [Console]::Out.WriteLine("DONE" + $requestId)
        } catch {
            [Console]::Out.WriteLine("ERROR" + $requestId + " " + $_.Exception.Message)
        }
        [Console]::Out.Flush()
    }
}
`;
}
