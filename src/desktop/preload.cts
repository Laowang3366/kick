import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('quickTranslate', {
  captureSelectedText: () => ipcRenderer.invoke('capture-selected-text'),
  copyText: (text: string) => ipcRenderer.invoke('copy-text', text),
  getDesktopSettings: () => ipcRenderer.invoke('get-desktop-settings'),
  onDesktopSettingsChanged: (callback: (settings: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: unknown) => callback(settings);
    ipcRenderer.on('desktop-settings-changed', listener);

    return () => {
      ipcRenderer.removeListener('desktop-settings-changed', listener);
    };
  },
  onFloatingSourceCaptured: (callback: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on('floating-source-captured', listener);

    return () => {
      ipcRenderer.removeListener('floating-source-captured', listener);
    };
  },
  onSelectionCaptured: (callback: (text: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on('selection-captured', listener);

    return () => {
      ipcRenderer.removeListener('selection-captured', listener);
    };
  },
  setDesktopSettings: (settings: unknown) => ipcRenderer.invoke('set-desktop-settings', settings),
  setFloatingSessionPreferences: (preferences: unknown) => ipcRenderer.invoke('set-floating-session-preferences', preferences),
  translateText: (input: unknown) => ipcRenderer.invoke('translate-text', input),
  windowControl: (command: unknown) => ipcRenderer.invoke('window-control', command)
});
