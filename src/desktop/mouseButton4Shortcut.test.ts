import { describe, expect, it, vi } from 'vitest';
import { extractMouseButton4ShortcutEvents, startMouseButton4Shortcut } from './mouseButton4Shortcut';

describe('extractMouseButton4ShortcutEvents', () => {
  it('extracts complete mouse button 4 events and keeps partial stdout lines', () => {
    const result = extractMouseButton4ShortcutEvents('ignored\nMOUSE_BUTTON_4\nMOUSE');

    expect(result.eventCount).toBe(1);
    expect(result.remainder).toBe('MOUSE');
  });

  it('counts multiple mouse button 4 events in one stdout chunk', () => {
    const result = extractMouseButton4ShortcutEvents('MOUSE_BUTTON_4\nMOUSE_BUTTON_4\n');

    expect(result.eventCount).toBe(2);
    expect(result.remainder).toBe('');
  });

  it('extracts the configurable mouse side button event name', () => {
    const result = extractMouseButton4ShortcutEvents('MOUSE_SIDE_BUTTON\n');

    expect(result.eventCount).toBe(1);
    expect(result.remainder).toBe('');
  });

  it('terminates the hook process tree when stopped', () => {
    const hookProcess = {
      pid: 1234,
      killed: false,
      kill: vi.fn(),
      stdout: {
        setEncoding: vi.fn(),
        on: vi.fn()
      },
      stderr: {
        setEncoding: vi.fn(),
        on: vi.fn()
      },
      on: vi.fn()
    };
    const terminateProcessTree = vi.fn();

    const shortcut = startMouseButton4Shortcut(vi.fn(), {
      spawnProcess: vi.fn(() => hookProcess as any) as any,
      terminateProcessTree
    });

    shortcut.stop();

    expect(terminateProcessTree).toHaveBeenCalledWith(1234);
    expect(hookProcess.kill).toHaveBeenCalledOnce();
  });

  it('restarts the mouse hook when the helper process exits unexpectedly', () => {
    const processes: any[] = [];
    const createHookProcess = (pid: number) => {
      const listeners = new Map<string, Function>();
      const process = {
        pid,
        killed: false,
        kill: vi.fn(),
        stdout: {
          setEncoding: vi.fn(),
          on: vi.fn()
        },
        stderr: {
          setEncoding: vi.fn(),
          on: vi.fn()
        },
        on: vi.fn((eventName: string, listener: Function) => {
          listeners.set(eventName, listener);
        }),
        emitClose: () => listeners.get('close')?.(1)
      };
      return process;
    };
    const spawnProcess = vi.fn(() => {
      const process = createHookProcess(2000 + processes.length);
      processes.push(process);
      return process;
    });

    const shortcut = startMouseButton4Shortcut(vi.fn(), {
      spawnProcess: spawnProcess as any
    });

    processes[0].emitClose();

    expect(spawnProcess).toHaveBeenCalledTimes(2);

    shortcut.stop();
    processes[1].emitClose();

    expect(spawnProcess).toHaveBeenCalledTimes(2);
  });
});
