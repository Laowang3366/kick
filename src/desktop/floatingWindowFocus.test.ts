import { describe, expect, it, vi } from 'vitest';
import { bringFloatingWindowToFront, showFloatingWindowWithoutFocus } from './floatingWindowFocus';

describe('floating window focus', () => {
  it('raises an unpinned floating window with a topmost pulse', () => {
    const window = {
      focus: vi.fn(),
      isAlwaysOnTop: vi.fn().mockReturnValue(false),
      moveTop: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      show: vi.fn()
    };

    bringFloatingWindowToFront(window);

    expect(window.setAlwaysOnTop).toHaveBeenNthCalledWith(1, true, 'pop-up-menu');
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
    expect(window.setAlwaysOnTop).toHaveBeenNthCalledWith(2, false);
    expect(window.moveTop).toHaveBeenCalledTimes(2);
  });

  it('keeps a pinned floating window pinned when raised', () => {
    const window = {
      focus: vi.fn(),
      isAlwaysOnTop: vi.fn().mockReturnValue(true),
      moveTop: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      show: vi.fn()
    };

    bringFloatingWindowToFront(window);

    expect(window.setAlwaysOnTop).not.toHaveBeenCalled();
    expect(window.show).toHaveBeenCalledOnce();
    expect(window.moveTop).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
  });

  it('can show a floating window without taking focus', () => {
    const window = {
      focus: vi.fn(),
      isAlwaysOnTop: vi.fn().mockReturnValue(false),
      moveTop: vi.fn(),
      setAlwaysOnTop: vi.fn(),
      show: vi.fn(),
      showInactive: vi.fn()
    };

    showFloatingWindowWithoutFocus(window);

    expect(window.setAlwaysOnTop).toHaveBeenNthCalledWith(1, true, 'pop-up-menu');
    expect(window.showInactive).toHaveBeenCalledOnce();
    expect(window.show).not.toHaveBeenCalled();
    expect(window.focus).not.toHaveBeenCalled();
    expect(window.setAlwaysOnTop).toHaveBeenNthCalledWith(2, false);
  });
});
