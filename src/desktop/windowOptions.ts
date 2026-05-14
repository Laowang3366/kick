import type { BrowserWindowConstructorOptions } from 'electron';

export function createMainWindowOptions(input: { iconPath: string; preloadPath: string }): BrowserWindowConstructorOptions {
  return {
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 520,
    show: false,
    alwaysOnTop: false,
    frame: false,
    autoHideMenuBar: true,
    title: '快捷翻译',
    icon: input.iconPath,
    backgroundColor: '#f8fbff',
    webPreferences: {
      preload: input.preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}

export function createFloatingWindowOptions(input: { preloadPath: string }): BrowserWindowConstructorOptions {
  return {
    width: 420,
    height: 360,
    minWidth: 340,
    minHeight: 280,
    show: false,
    frame: false,
    resizable: true,
    maximizable: false,
    minimizable: true,
    movable: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    title: '悬浮翻译',
    backgroundColor: '#f8fbff',
    acceptFirstMouse: true,
    webPreferences: {
      preload: input.preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}
