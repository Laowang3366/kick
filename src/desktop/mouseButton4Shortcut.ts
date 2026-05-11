import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createWindowsHelperEnvironment, getWindowsHelperTempDirectory } from './windowsHelperEnvironment.js';

const MOUSE_SIDE_BUTTON_EVENT = 'MOUSE_SIDE_BUTTON';
const LEGACY_MOUSE_BUTTON_4_EVENT = 'MOUSE_BUTTON_4';

export type MouseButton4Shortcut = {
  stop(): void;
};

export type MouseSideButton = 'mouse-button-4' | 'mouse-button-5';

export type MouseButton4ShortcutOptions = {
  scriptPath?: string;
  sideButton?: MouseSideButton;
  spawnProcess?: typeof spawn;
  terminateProcessTree?: (pid: number) => void;
  logger?: Pick<Console, 'warn'>;
};

export function extractMouseButton4ShortcutEvents(stdoutChunk: string, previousRemainder = '') {
  const combinedOutput = `${previousRemainder}${stdoutChunk}`;
  const lines = combinedOutput.split(/\r?\n/);
  const endsWithNewline = /\r?\n$/.test(combinedOutput);
  const completeLines = endsWithNewline ? lines.slice(0, -1) : lines.slice(0, -1);
  const remainder = endsWithNewline ? '' : (lines.at(-1) ?? '');
  const eventCount = completeLines.filter((line) => {
    const eventName = line.trim();
    return eventName === MOUSE_SIDE_BUTTON_EVENT || eventName === LEGACY_MOUSE_BUTTON_4_EVENT;
  }).length;

  return { eventCount, remainder };
}

export function startMouseButton4Shortcut(
  onPressed: () => void,
  options: MouseButton4ShortcutOptions = {}
): MouseButton4Shortcut {
  if (process.platform !== 'win32') {
    return { stop: () => undefined };
  }

  const sideButton = options.sideButton === 'mouse-button-5' ? 'mouse-button-5' : 'mouse-button-4';
  const scriptPath = options.scriptPath ?? path.join(getWindowsHelperTempDirectory(), `quick-translate-${sideButton}-hook.ps1`);
  mkdirSync(path.dirname(scriptPath), { recursive: true });
  writeFileSync(scriptPath, createMouseSideButtonHookScript(sideButton), 'utf8');

  const spawnProcess = options.spawnProcess ?? spawn;
  const terminateProcessTree = options.terminateProcessTree ?? terminateWindowsProcessTree;
  let hookProcess: ChildProcessWithoutNullStreams | null = null;
  let isStopped = false;
  let stdoutRemainder = '';

  function startHookProcess() {
    hookProcess = spawnProcess(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { env: createWindowsHelperEnvironment(), windowsHide: true }
    ) as ChildProcessWithoutNullStreams;
    stdoutRemainder = '';

    hookProcess.stdout.setEncoding('utf8');
    hookProcess.stdout.on('data', (chunk: string) => {
      const result = extractMouseButton4ShortcutEvents(chunk, stdoutRemainder);
      stdoutRemainder = result.remainder;

      for (let index = 0; index < result.eventCount; index += 1) {
        onPressed();
      }
    });

    hookProcess.stderr.setEncoding('utf8');
    hookProcess.stderr.on('data', (chunk: string) => {
      options.logger?.warn(`Mouse button 4 hook: ${chunk.trim()}`);
    });

    hookProcess.on('error', (error) => {
      options.logger?.warn(`Mouse button 4 hook failed: ${error.message}`);
    });

    hookProcess.on('close', () => {
      hookProcess = null;
      if (!isStopped) {
        startHookProcess();
      }
    });
  }

  startHookProcess();

  return {
    stop() {
      isStopped = true;
      if (typeof hookProcess?.pid === 'number') {
        terminateProcessTree(hookProcess.pid);
      }
      if (hookProcess && !hookProcess.killed) {
        hookProcess.kill();
      }
      hookProcess = null;
    }
  };
}

function terminateWindowsProcessTree(pid: number) {
  if (process.platform !== 'win32') {
    return;
  }

  execFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => undefined);
}

function createMouseSideButtonHookScript(sideButton: MouseSideButton) {
  const xButton = sideButton === 'mouse-button-5' ? 2 : 1;

  return String.raw`
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class MouseButton4Hook
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_XBUTTONDOWN = 0x020B;
    private const int TARGET_XBUTTON = ${xButton};
    private static LowLevelMouseProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;

    public static void Main()
    {
        _hookID = SetHook(_proc);
        Application.Run();
        UnhookWindowsHookEx(_hookID);
    }

    private static IntPtr SetHook(LowLevelMouseProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0 && wParam == (IntPtr)WM_XBUTTONDOWN)
        {
            MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
            int xButton = (hookStruct.mouseData >> 16) & 0xffff;
            if (xButton == TARGET_XBUTTON)
            {
                Console.Out.WriteLine("MOUSE_SIDE_BUTTON");
                Console.Out.Flush();
                return (IntPtr)1;
            }
        }

        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT
    {
        public POINT pt;
        public int mouseData;
        public int flags;
        public int time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
"@

[MouseButton4Hook]::Main()
`;
}
