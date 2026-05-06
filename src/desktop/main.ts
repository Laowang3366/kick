import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { captureSelectedText } from './captureSelection.js';
import { startMouseButton4Shortcut, type MouseButton4Shortcut } from './mouseButton4Shortcut.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let mouseButton4Shortcut: MouseButton4Shortcut | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    show: false,
    alwaysOnTop: true,
    title: '快捷翻译',
    backgroundColor: '#eef2f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    await mainWindow.loadURL('http://127.0.0.1:5173');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
}

async function captureFromSelection() {
  const text = await captureSelectedText({
    clipboard,
    sendCopyShortcut: sendWindowsCopyShortcut,
    wait,
    copyDelayMs: 140
  });

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

app.whenReady().then(async () => {
  await createWindow();

  mouseButton4Shortcut = startMouseButton4Shortcut(() => {
    void captureFromSelection();
  });

  ipcMain.handle('capture-selected-text', () => captureFromSelection());
  ipcMain.handle('copy-text', (_event, text: string) => {
    clipboard.writeText(text);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('will-quit', () => {
  mouseButton4Shortcut?.stop();
  mouseButton4Shortcut = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
