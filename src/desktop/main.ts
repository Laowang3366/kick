import { app, BrowserWindow, Menu, Tray, clipboard, globalShortcut, ipcMain, nativeImage, screen } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { checkForUpdates, startAutoUpdates } from './autoUpdate.js';
import { resolveDesktopBackendBaseUrl, translateWithBackend } from './backendTranslationClient.js';
import { captureSelectedText } from './captureSelection.js';
import {
  defaultDesktopSettings,
  floatingTranslateShortcutOptions,
  getFloatingTranslateShortcutAccelerator,
  getFloatingTranslateShortcutLabel,
  mergeDesktopSettings,
  normalizeFloatingTranslateShortcut,
  parseDesktopSettings,
  serializeDesktopSettings,
  type DesktopSettings,
  type FloatingTranslateShortcut
} from './desktopSettings.js';
import { destroyExistingFloatingWindow } from './floatingWindowLifecycle.js';
import { createFloatingWindowBounds } from './floatingWindowBounds.js';
import {
  readFloatingSessionPreferences,
  updateFloatingSessionPreferences,
  type FloatingSessionPreferenceState
} from './floatingSessionPreferences.js';
import { startMouseButton4Shortcut, type MouseButton4Shortcut } from './mouseButton4Shortcut.js';
import { getProviderSettingsPath, loadBackendProviderSettings } from './providerSettings.js';
import { createFloatingWindowOptions, createMainWindowOptions } from './windowOptions.js';
import { createProviderFromSettings } from '../shared/providerSettings.js';
import { translateText } from '../shared/translator.js';
import { normalizeTranslationFormat, type TranslationFormat } from '../shared/translationFormats.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isSmokeTest = process.argv.includes('--smoke-test');

if (isSmokeTest) {
  const smokeUserDataPath = path.join(tmpdir(), 'quick-translate-electron-smoke');
  mkdirSync(smokeUserDataPath, { recursive: true });
  app.setPath('userData', smokeUserDataPath);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;
let mouseButton4Shortcut: MouseButton4Shortcut | null = null;
let keyboardFloatingShortcutAccelerator: string | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let desktopSettings: DesktopSettings = defaultDesktopSettings;
let floatingSessionPreferences: FloatingSessionPreferenceState = {};
const floatingWindowSizes = {
  compact: { width: 360, height: 300 },
  standard: { width: 420, height: 360 },
  large: { width: 560, height: 460 }
};

async function createWindow() {
  mainWindow = new BrowserWindow(
    createMainWindowOptions({
      iconPath: resolveAssetPath('desktop-icon.ico'),
      preloadPath: path.join(__dirname, 'preload.cjs')
    })
  );
  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (event) => {
    if (mainWindow?.isFocused() && desktopSettings.hideToTrayOnClose && !isQuitting && !isSmokeTest) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.once('did-finish-load', async () => {
    if (!isSmokeTest) {
      return;
    }

    const smokeResult = await mainWindow?.webContents
      .executeJavaScript(
        `new Promise((resolve) => {
          const startedAt = Date.now();
          const readText = () => document.body.innerText || '';
          const check = () => {
            const text = readText();
            if (text.includes('快捷翻译') || Date.now() - startedAt > 10000) {
              resolve({
                bodyText: text,
                hasQuickTranslate: Boolean(window.quickTranslate),
                hasTranslateText: typeof window.quickTranslate?.translateText === 'function',
                hasGetDesktopSettings: typeof window.quickTranslate?.getDesktopSettings === 'function',
                hasCheckForUpdates: typeof window.quickTranslate?.checkForUpdates === 'function',
              hasWindowControl: typeof window.quickTranslate?.windowControl === 'function',
              hasFloatingSessionPreferences: typeof window.quickTranslate?.setFloatingSessionPreferences === 'function',
                hasPinButton: Boolean(document.querySelector('[aria-label="置顶窗口"]')),
                pinPressed: document.querySelector('[aria-label="置顶窗口"]')?.getAttribute('aria-pressed')
              });
              return;
            }
            setTimeout(check, 100);
          };
          check();
        })`
      )
      .catch(() => undefined);
    const smokePassed =
      isRecord(smokeResult) &&
      typeof smokeResult.bodyText === 'string' &&
      smokeResult.bodyText.includes('快捷翻译') &&
      smokeResult.hasQuickTranslate === true &&
      smokeResult.hasTranslateText === true &&
      smokeResult.hasGetDesktopSettings === true &&
      smokeResult.hasCheckForUpdates === true &&
      smokeResult.hasWindowControl === true &&
      smokeResult.hasFloatingSessionPreferences === true &&
      smokeResult.hasPinButton === true &&
      smokeResult.pinPressed === 'false' &&
      mainWindow?.isAlwaysOnTop() === false &&
      mainWindow?.isMenuBarVisible() === false;

    if (!smokePassed) {
      console.error(`[桌面冒烟] preload 桥未就绪：${JSON.stringify(smokeResult)}`);
    }

    const floatingSmokePassed = smokePassed ? await runFloatingSmokeCheck() : false;

    app.exit(smokePassed && floatingSmokePassed ? 0 : 1);
  });

  mainWindow.once('ready-to-show', () => {
    if (!isSmokeTest) {
      mainWindow?.show();
    }
  });

  await loadRendererWindow(mainWindow);
}

async function runFloatingSmokeCheck() {
  const window = await createFloatingWindow();
  const smokeResult = await window.webContents
    .executeJavaScript(
      `new Promise((resolve) => {
        const startedAt = Date.now();
        const readAppRegion = (selector) => {
          const node = document.querySelector(selector);
          if (!node) {
            return '';
          }
          const style = getComputedStyle(node);
          return style.getPropertyValue('-webkit-app-region') || style.webkitAppRegion || '';
        };
        const check = async () => {
          const text = document.body.innerText || '';
          if (text.includes('自动检测') || Date.now() - startedAt > 10000) {
            const formatSelect = document.querySelector('[aria-label="悬浮翻译格式"]');
            const shellStyle = getComputedStyle(document.querySelector('.floating-shell'));
            const cardStyle = getComputedStyle(document.querySelector('.floating-card'));
            const sessionPreferenceResult = await window.quickTranslate?.setFloatingSessionPreferences?.({
              targetLanguage: 'en-US',
              translationFormat: 'java-camel-case'
            });
            resolve({
              bodyText: text,
              hasQuickTranslate: Boolean(window.quickTranslate),
              hasFloatingHandler: typeof window.quickTranslate?.onFloatingSourceCaptured === 'function',
              hasTargetLanguage: text.includes('简体中文'),
              hasMinimizeButton: Boolean(document.querySelector('[aria-label="最小化悬浮窗"]')),
              hasFormatSelect: Boolean(formatSelect),
              formatDisabledForChinese: formatSelect?.disabled === true,
              floatingCardDragRegion: readAppRegion('.floating-card'),
              floatingSourceNoDragRegion: readAppRegion('.floating-source-card'),
              floatingActionsNoDragRegion: readAppRegion('.floating-window-actions'),
              floatingShellPadding: shellStyle.padding,
              floatingShellBackground: shellStyle.backgroundColor,
              floatingCardBorderTopWidth: cardStyle.borderTopWidth,
              floatingCardBoxShadow: cardStyle.boxShadow,
              sessionPreferenceResult
            });
            return;
          }
          setTimeout(check, 100);
        };
        check();
      })`
    )
    .catch(() => undefined);
  const smokePassed =
    isRecord(smokeResult) &&
    typeof smokeResult.bodyText === 'string' &&
    smokeResult.bodyText.includes('自动检测') &&
    smokeResult.hasQuickTranslate === true &&
    smokeResult.hasFloatingHandler === true &&
    smokeResult.hasTargetLanguage === true &&
    smokeResult.hasMinimizeButton === true &&
    smokeResult.hasFormatSelect === true &&
    smokeResult.formatDisabledForChinese === true &&
    smokeResult.floatingCardDragRegion === 'drag' &&
    smokeResult.floatingSourceNoDragRegion === 'no-drag' &&
    smokeResult.floatingActionsNoDragRegion === 'no-drag' &&
    smokeResult.floatingShellPadding === '0px' &&
    smokeResult.floatingShellBackground === 'rgb(255, 255, 255)' &&
    smokeResult.floatingCardBorderTopWidth === '0px' &&
    smokeResult.floatingCardBoxShadow === 'none' &&
    isRecord(smokeResult.sessionPreferenceResult) &&
    smokeResult.sessionPreferenceResult.targetLanguage === 'en-US' &&
    smokeResult.sessionPreferenceResult.translationFormat === 'java-camel-case';

  if (!smokePassed) {
    console.error(`[桌面冒烟] 悬浮窗未就绪：${JSON.stringify(smokeResult)}`);
  }

  return smokePassed;
}

async function loadRendererWindow(window: BrowserWindow, options: { floating?: boolean } = {}) {
  if (app.isPackaged) {
    await window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), options.floating ? { query: { floating: '1' } } : undefined);
    return;
  }

  await window.loadURL(`http://127.0.0.1:5173${options.floating ? '?floating=1' : ''}`);
}

async function readSelectedTextFromSystem() {
  return captureSelectedText({
    clipboard,
    sendCopyShortcut: sendWindowsCopyShortcut,
    wait,
    copyDelayMs: 140
  });
}

async function captureFromSelection() {
  const text = await readSelectedTextFromSystem();

  if (!text) {
    mainWindow?.show();
    mainWindow?.focus();
    return '';
  }

  mainWindow?.show();
  mainWindow?.focus();
  mainWindow?.webContents.send('selection-captured', text);
  return text;
}

async function handleGlobalMouseButton4Shortcut() {
  const text = await readSelectedTextFromSystem();

  if (isMainWindowReadyForInlineTranslation()) {
    mainWindow?.show();
    mainWindow?.focus();

    if (text) {
      mainWindow?.webContents.send('selection-captured', text);
    }
    return;
  }

  await showFloatingTranslation(text);
}

function isMainWindowReadyForInlineTranslation() {
  return Boolean(mainWindow && mainWindow.isVisible() && !mainWindow.isMinimized());
}

async function sendWindowsCopyShortcut() {
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"
  ]);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDesktopSettingsPath() {
  return path.join(app.getPath('userData'), 'desktop-settings.json');
}

function loadDesktopSettings(): DesktopSettings {
  const settingsPath = getDesktopSettingsPath();
  return parseDesktopSettings(existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : undefined);
}

function saveDesktopSettings(settings: DesktopSettings) {
  writeFileSync(getDesktopSettingsPath(), serializeDesktopSettings(settings), 'utf8');
}

function getBackendProviderSettingsPath() {
  return getProviderSettingsPath(app.getPath('userData'));
}

function loadCurrentProvider() {
  return createProviderFromSettings(
    loadBackendProviderSettings({
      settingsPath: getBackendProviderSettingsPath(),
      env: process.env
    })
  );
}

async function translateUsingConfiguredChannel(request: { text: string; targetLanguage: string; translationFormat: TranslationFormat }) {
  const directProvider = loadCurrentProvider();

  try {
    return await translateWithBackend(request, {
      baseUrl: resolveDesktopBackendBaseUrl(process.env)
    });
  } catch (error) {
    if (directProvider.type === 'openai-compatible') {
      return translateText({
        text: request.text,
        targetLanguage: request.targetLanguage,
        translationFormat: request.translationFormat,
        provider: directProvider
      });
    }

    throw error;
  }
}

function setFloatingTranslateShortcut(shortcut: FloatingTranslateShortcut) {
  mouseButton4Shortcut?.stop();
  mouseButton4Shortcut = null;

  if (keyboardFloatingShortcutAccelerator) {
    globalShortcut.unregister(keyboardFloatingShortcutAccelerator);
    keyboardFloatingShortcutAccelerator = null;
  }

  const normalizedShortcut = normalizeFloatingTranslateShortcut(shortcut);
  if (normalizedShortcut === 'mouse-button-4' || normalizedShortcut === 'mouse-button-5') {
    mouseButton4Shortcut = startMouseButton4Shortcut(() => {
      void handleGlobalMouseButton4Shortcut();
    }, {
      sideButton: normalizedShortcut
    });
    return;
  }

  const accelerator = getFloatingTranslateShortcutAccelerator(normalizedShortcut);
  if (accelerator) {
    const isRegistered = globalShortcut.register(accelerator, () => {
      void handleGlobalMouseButton4Shortcut();
    });
    if (isRegistered) {
      keyboardFloatingShortcutAccelerator = accelerator;
    } else {
      console.warn(`[快捷键] 注册失败：${getFloatingTranslateShortcutLabel(normalizedShortcut)}`);
    }
  }
}

async function createFloatingWindow() {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    return floatingWindow;
  }

  floatingWindow = new BrowserWindow(createFloatingWindowOptions({ preloadPath: path.join(__dirname, 'preload.cjs') }));
  floatingWindow.setMenu(null);
  floatingWindow.setMenuBarVisibility(false);
  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
  await loadRendererWindow(floatingWindow, { floating: true });

  return floatingWindow;
}

async function showFloatingTranslation(text: string) {
  floatingWindow = destroyExistingFloatingWindow(floatingWindow);
  const window = await createFloatingWindow();
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const cursorPoint = screen.getCursorScreenPoint();
  const bounds = window.getBounds();

  window.setBounds(createFloatingWindowBounds(workArea, cursorPoint, bounds));
  window.show();
  window.focus();
  setTimeout(() => {
    const preferences = getFloatingSessionPreferences();
    window.webContents.send('floating-source-captured', {
      text,
      targetLanguage: preferences.targetLanguage,
      translationFormat: preferences.translationFormat
    });
  }, 50);
}

function getFloatingSessionPreferences() {
  return readFloatingSessionPreferences(floatingSessionPreferences, {
    targetLanguage: desktopSettings.defaultTargetLanguage,
    translationFormat: desktopSettings.defaultTranslationFormat
  });
}

function updateFloatingSessionPreferenceState(input: unknown) {
  if (!isRecord(input)) {
    return getFloatingSessionPreferences();
  }

  floatingSessionPreferences = updateFloatingSessionPreferences(floatingSessionPreferences, {
    targetLanguage: typeof input.targetLanguage === 'string' ? input.targetLanguage : undefined,
    translationFormat:
      typeof input.translationFormat === 'string' ? normalizeTranslationFormat(input.translationFormat) : undefined
  });

  return getFloatingSessionPreferences();
}

function applyDesktopSettings(settings: DesktopSettings) {
  desktopSettings = settings;
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin });
  setFloatingTranslateShortcut(settings.floatingTranslateShortcut);
  updateTrayMenu();
  mainWindow?.webContents.send('desktop-settings-changed', settings);
}

function updateDesktopSettings(settingsPatch: Partial<DesktopSettings>) {
  const nextSettings = mergeDesktopSettings(desktopSettings, settingsPatch);
  saveDesktopSettings(nextSettings);
  applyDesktopSettings(nextSettings);
  return nextSettings;
}

function executeWindowControl(command: unknown) {
  const normalizedCommand = normalizeWindowControlCommand(command);

  switch (normalizedCommand) {
    case 'minimize':
      mainWindow?.minimize();
      break;
    case 'toggle-maximize':
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow?.maximize();
      }
      break;
    case 'close':
      mainWindow?.close();
      break;
    case 'hide-main-window':
      if (desktopSettings.hideToTrayOnClose && !isSmokeTest) {
        mainWindow?.hide();
      } else {
        mainWindow?.close();
      }
      break;
    case 'toggle-always-on-top': {
      if (!mainWindow) {
        return false;
      }

      mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
      return mainWindow.isAlwaysOnTop();
    }
    case 'toggle-floating-always-on-top': {
      if (!floatingWindow || floatingWindow.isDestroyed()) {
        return false;
      }

      floatingWindow.setAlwaysOnTop(!floatingWindow.isAlwaysOnTop());
      return floatingWindow.isAlwaysOnTop();
    }
    case 'minimize-floating-window':
      floatingWindow?.minimize();
      break;
    case 'resize-floating-window-compact':
      return resizeFloatingWindow('compact');
    case 'resize-floating-window-standard':
      return resizeFloatingWindow('standard');
    case 'resize-floating-window-large':
      return resizeFloatingWindow('large');
    case 'show-main-window':
      showMainWindow();
      floatingWindow?.hide();
      break;
    case 'hide-floating-window':
      floatingWindow?.hide();
      break;
  }
}

type WindowControlCommand =
  | 'minimize'
  | 'toggle-maximize'
  | 'close'
  | 'hide-main-window'
  | 'toggle-always-on-top'
  | 'toggle-floating-always-on-top'
  | 'minimize-floating-window'
  | 'resize-floating-window-compact'
  | 'resize-floating-window-standard'
  | 'resize-floating-window-large'
  | 'show-main-window'
  | 'hide-floating-window';

function normalizeWindowControlCommand(command: unknown): WindowControlCommand {
  if (
    command === 'minimize' ||
    command === 'toggle-maximize' ||
    command === 'close' ||
    command === 'hide-main-window' ||
    command === 'toggle-always-on-top' ||
    command === 'toggle-floating-always-on-top' ||
    command === 'minimize-floating-window' ||
    command === 'resize-floating-window-compact' ||
    command === 'resize-floating-window-standard' ||
    command === 'resize-floating-window-large' ||
    command === 'show-main-window' ||
    command === 'hide-floating-window'
  ) {
    return command;
  }

  throw new Error('窗口操作无效');
}

function showMainWindow() {
  if (!mainWindow) {
    void createWindow();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function resizeFloatingWindow(size: keyof typeof floatingWindowSizes) {
  if (!floatingWindow || floatingWindow.isDestroyed()) {
    return false;
  }

  const targetSize = floatingWindowSizes[size];
  const currentBounds = floatingWindow.getBounds();
  const { workArea } = screen.getDisplayMatching(currentBounds);
  const maxX = workArea.x + workArea.width - targetSize.width;
  const maxY = workArea.y + workArea.height - targetSize.height;
  floatingWindow.setBounds({
    x: Math.min(Math.max(currentBounds.x, workArea.x), maxX),
    y: Math.min(Math.max(currentBounds.y, workArea.y), maxY),
    ...targetSize
  });
  return targetSize;
}

function createTray() {
  if (tray) {
    return;
  }

  const icon = nativeImage.createFromPath(resolveAssetPath('desktop-icon.ico'));
  tray = new Tray(icon);
  tray.setToolTip('快捷翻译');
  tray.on('click', showMainWindow);
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示快捷翻译', click: showMainWindow },
      { type: 'separator' },
      {
        label: `悬浮翻译快捷键：${getFloatingTranslateShortcutLabel(desktopSettings.floatingTranslateShortcut)}`,
        submenu: [
          {
            label: `当前：${getFloatingTranslateShortcutLabel(desktopSettings.floatingTranslateShortcut)}`,
            enabled: false
          },
          { type: 'separator' as const },
          ...floatingTranslateShortcutOptions.map((option) => ({
            label: option.label,
            type: 'radio' as const,
            checked: desktopSettings.floatingTranslateShortcut === option.value,
            click: () => updateDesktopSettings({ floatingTranslateShortcut: option.value })
          }))
        ]
      },
      {
        label: '开机自启',
        type: 'checkbox',
        checked: desktopSettings.launchAtLogin,
        click: (menuItem) => updateDesktopSettings({ launchAtLogin: menuItem.checked })
      },
      {
        label: '关闭时隐藏到托盘',
        type: 'checkbox',
        checked: desktopSettings.hideToTrayOnClose,
        click: (menuItem) => updateDesktopSettings({ hideToTrayOnClose: menuItem.checked })
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
}

function resolveAssetPath(fileName: string) {
  const appRootPath = app.isPackaged ? app.getAppPath() : process.cwd();
  const candidates = [
    path.join(appRootPath, 'build', 'icons', fileName),
    path.join(appRootPath, 'public', fileName),
    path.join(appRootPath, 'dist', fileName),
    path.join(process.cwd(), 'build', 'icons', fileName),
    path.join(process.cwd(), 'public', fileName),
    path.join(process.cwd(), 'dist', fileName),
    path.join(__dirname, '../../build/icons', fileName),
    path.join(__dirname, '../../dist', fileName),
    path.join(__dirname, '../dist', fileName)
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function normalizeTranslationIpcInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error('翻译请求无效');
  }

  const text = typeof input.text === 'string' ? input.text : '';
  const targetLanguage = typeof input.targetLanguage === 'string' ? input.targetLanguage : '';
  const translationFormat = normalizeTranslationFormat(
    typeof input.translationFormat === 'string' ? input.translationFormat : desktopSettings.defaultTranslationFormat
  );

  if (!targetLanguage.trim()) {
    throw new Error('目标语言不能为空');
  }

  return { text, targetLanguage, translationFormat };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

app.whenReady().then(async () => {
  desktopSettings = loadDesktopSettings();
  Menu.setApplicationMenu(null);
  ipcMain.handle('capture-selected-text', () => captureFromSelection());
  ipcMain.handle('copy-text', (_event, text: string) => {
    clipboard.writeText(text);
  });
  ipcMain.handle('get-desktop-settings', () => desktopSettings);
  ipcMain.handle('check-for-updates', () =>
    checkForUpdates(isSmokeTest, (progress) => {
      mainWindow?.webContents.send('desktop-update-progress', progress);
    })
  );
  ipcMain.handle('set-desktop-settings', (_event, settings: Partial<DesktopSettings>) => updateDesktopSettings(settings));
  ipcMain.handle('set-floating-session-preferences', (_event, preferences: unknown) => updateFloatingSessionPreferenceState(preferences));
  ipcMain.handle('window-control', (_event, command: unknown) => executeWindowControl(command));
  ipcMain.handle('translate-text', (_event, input: unknown) => {
    const request = normalizeTranslationIpcInput(input);
    return translateUsingConfiguredChannel(request);
  });
  await createWindow();
  createTray();
  applyDesktopSettings(desktopSettings);
  startAutoUpdates(isSmokeTest);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  mouseButton4Shortcut?.stop();
  mouseButton4Shortcut = null;
  if (keyboardFloatingShortcutAccelerator) {
    globalShortcut.unregister(keyboardFloatingShortcutAccelerator);
    keyboardFloatingShortcutAccelerator = null;
  }
  floatingWindow?.destroy();
  floatingWindow = null;
  tray?.destroy();
  tray = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
