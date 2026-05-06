import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('quickTranslate', {
  captureSelectedText: () => ipcRenderer.invoke('capture-selected-text'),
  copyText: (text: string) => ipcRenderer.invoke('copy-text', text),
  onSelectionCaptured: (callback: (text: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on('selection-captured', listener);

    return () => {
      ipcRenderer.removeListener('selection-captured', listener);
    };
  }
});
