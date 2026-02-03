import { contextBridge, shell, app } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => Promise.resolve(app.getVersion()),
  openExternal: (url: string) => shell.openExternal(url),
});
