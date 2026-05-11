import { describe, expect, it, vi } from 'vitest';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWindowsCopyShortcutSender } from './windowsCopyShortcut';

describe('windows copy shortcut sender', () => {
  it('keeps one helper process alive and sends copy commands through stdin', async () => {
    const stdoutListeners = new Map<string, Function>();
    const hookProcess = {
      pid: 3456,
      killed: false,
      stdin: {
        write: vi.fn((value: string) => {
          expect(value).toBe('COPY\n');
          queueMicrotask(() => stdoutListeners.get('data')?.('DONE\n'));
          return true;
        })
      },
      stdout: {
        setEncoding: vi.fn(),
        on: vi.fn((eventName: string, listener: Function) => {
          stdoutListeners.set(eventName, listener);
        })
      },
      stderr: {
        setEncoding: vi.fn(),
        on: vi.fn()
      },
      on: vi.fn(),
      kill: vi.fn()
    };
    const spawnProcess = vi.fn(() => hookProcess as any);
    const sender = createWindowsCopyShortcutSender({
      spawnProcess: spawnProcess as any,
      scriptPath: path.join(tmpdir(), 'quick-translate-copy-helper-test.ps1')
    });

    await sender.send();
    await sender.send();

    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(hookProcess.stdin.write).toHaveBeenCalledTimes(2);
  });

  it('can warm up the helper before the first copy request', async () => {
    const hookProcess = {
      pid: 3456,
      killed: false,
      stdin: { write: vi.fn() },
      stdout: {
        setEncoding: vi.fn(),
        on: vi.fn()
      },
      stderr: {
        setEncoding: vi.fn(),
        on: vi.fn()
      },
      on: vi.fn(),
      kill: vi.fn()
    };
    const spawnProcess = vi.fn(() => hookProcess as any);
    const sender = createWindowsCopyShortcutSender({
      spawnProcess: spawnProcess as any,
      scriptPath: path.join(tmpdir(), 'quick-translate-copy-helper-warmup-test.ps1')
    });

    sender.warmUp();
    sender.warmUp();

    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(hookProcess.stdin.write).not.toHaveBeenCalled();
  });
});
