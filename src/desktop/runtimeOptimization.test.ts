import { describe, expect, it, vi } from 'vitest';
import { applyLightweightRuntime } from './runtimeOptimization';

describe('runtime optimization', () => {
  it('disables hardware acceleration and GPU shader cache for the desktop client', () => {
    const app = {
      disableHardwareAcceleration: vi.fn(),
      commandLine: {
        appendSwitch: vi.fn()
      }
    };

    applyLightweightRuntime(app, 'win32');

    expect(app.disableHardwareAcceleration).toHaveBeenCalledTimes(1);
    expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('disable-gpu-shader-disk-cache');
  });

  it('keeps hardware acceleration enabled on macOS', () => {
    const app = {
      disableHardwareAcceleration: vi.fn(),
      commandLine: {
        appendSwitch: vi.fn()
      }
    };

    applyLightweightRuntime(app, 'darwin');

    expect(app.disableHardwareAcceleration).not.toHaveBeenCalled();
    expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
  });
});
