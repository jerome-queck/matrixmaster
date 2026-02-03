import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  openExternal: (url: string) => shell.openExternal(url),
  onUpdateStatus: (callback: (payload: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
});
