import { describe, expect, it } from 'vitest';
import { createFloatingWindowOptions, createMainWindowOptions } from './windowOptions';

describe('main window options', () => {
  it('uses a frameless window so only the in-app title bar is shown', () => {
    const options = createMainWindowOptions({
      iconPath: 'icon.svg',
      preloadPath: 'preload.cjs'
    });

    expect(options.frame).toBe(false);
    expect(options.autoHideMenuBar).toBe(true);
    expect(options.title).toBe('快捷翻译');
    expect(options.width).toBe(1180);
    expect(options.height).toBe(760);
    expect(options.alwaysOnTop).toBe(false);
  });

  it('uses a movable and minimizable frameless floating window', () => {
    const options = createFloatingWindowOptions({
      preloadPath: 'preload.cjs'
    });

    expect(options.width).toBe(420);
    expect(options.height).toBe(360);
    expect(options.minWidth).toBe(340);
    expect(options.minHeight).toBe(280);
    expect(options.frame).toBe(false);
    expect(options.resizable).toBe(true);
    expect(options.minimizable).toBe(true);
    expect(options.movable).toBe(true);
    expect(options.alwaysOnTop).toBe(false);
    expect(options.acceptFirstMouse).toBe(true);
    expect(options.skipTaskbar).toBe(true);
    expect(options.title).toBe('悬浮翻译');
  });
});
