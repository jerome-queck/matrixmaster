import { app, BrowserWindow, dialog, shell, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

const createWindow = () => {
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.ts');

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    backgroundColor: '#0b0b0f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !(isDev && url.startsWith(devServerUrl))) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(devServerUrl).catch(() => undefined);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(process.cwd(), 'dist', 'index.html')).catch(() => undefined);
  }

  return win;
};

const configureOfflineGuards = () => {
  const allowedHosts = new Set([
    'localhost',
    '127.0.0.1',
    'github.com',
    'api.github.com',
    'objects.githubusercontent.com',
    'github-releases.githubusercontent.com',
  ]);

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    try {
      const url = new URL(details.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (allowedHosts.has(url.hostname) && (isDev || url.hostname.includes('github'))) {
          return callback({ cancel: false });
        }
        return callback({ cancel: true });
      }
    } catch {
      return callback({ cancel: false });
    }
    return callback({ cancel: false });
  });
};

const configureAutoUpdates = () => {
  if (isDev) return;

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update available',
      message: 'A new version is available. It will download in the background.',
    }).catch(() => undefined);
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update ready',
      message: 'Update downloaded. Restart to apply?',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    }).catch(() => undefined);
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
};

app.whenReady().then(() => {
  configureOfflineGuards();
  const win = createWindow();
  configureAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      win?.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
