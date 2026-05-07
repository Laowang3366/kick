import { describe, expect, it, vi } from 'vitest';
import { destroyExistingFloatingWindow } from './floatingWindowLifecycle';

describe('floating window lifecycle', () => {
  it('destroys the current floating window before opening a fresh one', () => {
    const currentWindow = {
      destroy: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false)
    };

    expect(destroyExistingFloatingWindow(currentWindow)).toBeNull();

    expect(currentWindow.destroy).toHaveBeenCalledOnce();
  });

  it('ignores already destroyed floating windows', () => {
    const currentWindow = {
      destroy: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(true)
    };

    expect(destroyExistingFloatingWindow(currentWindow)).toBeNull();

    expect(currentWindow.destroy).not.toHaveBeenCalled();
  });
});
