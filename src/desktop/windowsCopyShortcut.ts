import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createWindowsHelperEnvironment, getWindowsHelperTempDirectory } from './windowsHelperEnvironment.js';

type CopyShortcutSenderOptions = {
  scriptPath?: string;
  spawnProcess?: typeof spawn;
  logger?: Pick<Console, 'warn'>;
};

type PendingCopyRequest = {
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
  let helperProcess: ChildProcessWithoutNullStreams | null = null;
  let stdoutRemainder = '';
  let pendingRequests: PendingCopyRequest[] = [];

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
      if (output === 'DONE') {
        pendingRequests.shift()?.resolve();
      } else if (output.startsWith('ERROR')) {
        pendingRequests.shift()?.reject(new Error(output));
      }
    }
  }

  function rejectPendingRequests(error: unknown) {
    const requests = pendingRequests;
    pendingRequests = [];
    for (const request of requests) {
      request.reject(error);
    }
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
        pendingRequests.push({ resolve, reject });
        try {
          process.stdin.write('COPY\n');
        } catch (error) {
          pendingRequests = pendingRequests.filter((request) => request.resolve !== resolve);
          reject(error);
        }
      });
    },
    stop() {
      rejectPendingRequests(new Error('Copy shortcut helper stopped'));
      if (helperProcess && !helperProcess.killed) {
        helperProcess.kill();
      }
      helperProcess = null;
    }
  };
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
    if ($line.Trim() -eq "COPY") {
        try {
            [QuickTranslateCopyShortcut]::SendCopy()
            [Console]::Out.WriteLine("DONE")
        } catch {
            [Console]::Out.WriteLine("ERROR " + $_.Exception.Message)
        }
        [Console]::Out.Flush()
    }
}
`;
}
