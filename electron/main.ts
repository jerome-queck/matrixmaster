import { app, BrowserWindow, dialog, ipcMain, shell, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'fs';
import path from 'path';

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let lastCheckedAt: string | null = null;

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
    try {
      const target = new URL(url);
      if (target.protocol === 'file:') return;
      if (isDev) {
        const devOrigin = new URL(devServerUrl).origin;
        if (target.origin === devOrigin) return;
      }
    } catch {
      // Fall through to prevent navigation on invalid URLs.
    }
    event.preventDefault();
  });

  win.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('did-fail-load', { code, desc, url });
    win.webContents.send('health-status', { status: 'error', message: `Failed to load ${url}: ${desc} (${code})` });
    win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('render-process-gone', details);
    win.webContents.send('health-status', { status: 'error', message: `Renderer crashed: ${details.reason}` });
    win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('health-status', { status: 'ok' });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === 'http:' || target.protocol === 'https:') {
        shell.openExternal(url).catch(() => undefined);
      }
    } catch {
      // Ignore invalid URLs.
    }
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(devServerUrl).catch(() => undefined);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const appRoot = app.getAppPath();
    const indexPath = path.join(appRoot, 'dist', 'index.html');
    console.log('Loading index.html from', indexPath);
    win.loadFile(indexPath).catch((err) => {
      console.error('loadFile failed', err);
      win.webContents.openDevTools({ mode: 'detach' });
    });
  }

  mainWindow = win;
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

const sendUpdateStatus = (payload: Record<string, unknown>) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', payload);
  }
};

const sanitizeUpdateError = (error: unknown) => {
  let rawMessage = '';
  if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    rawMessage = String((error as { message?: unknown }).message ?? '');
  }

  if (!rawMessage) return 'Update error';

  const lower = rawMessage.toLowerCase();
  if (lower.includes('latest-mac.yml')) {
    return 'Update metadata missing for this release. Please download the latest version from GitHub Releases.';
  }

  const headerIndex = rawMessage.indexOf('Headers:');
  if (headerIndex !== -1) {
    rawMessage = rawMessage.slice(0, headerIndex).trim();
  }
  rawMessage = rawMessage.split('\n')[0]?.trim() || rawMessage.trim();

  if (rawMessage.length > 160) {
    return `${rawMessage.slice(0, 157)}...`;
  }
  return rawMessage || 'Update error';
};

const configureAutoUpdates = () => {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    lastCheckedAt = new Date().toISOString();
    sendUpdateStatus({ state: 'checking', lastCheckedAt });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ state: 'available', version: info?.version });
    dialog.showMessageBox({
      type: 'info',
      title: 'Update available',
      message: 'A new version is available. It will download in the background.',
    }).catch(() => undefined);
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ state: 'up-to-date', lastCheckedAt });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      state: 'downloading',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus({ state: 'ready' });
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

  autoUpdater.on('error', (error) => {
    sendUpdateStatus({ state: 'error', message: sanitizeUpdateError(error) });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    sendUpdateStatus({ state: 'error', message: sanitizeUpdateError(error) });
  });
};

const registerIpc = () => {
  ipcMain.handle('app-version', () => app.getVersion());
  const handleUnsupportedUpdate = () => {
    const message = 'Updates are only available in packaged builds.';
    sendUpdateStatus({ state: 'unsupported', message });
    return { state: 'unsupported', message };
  };
  const handleUpdateError = (error: unknown) => {
    const message = sanitizeUpdateError(error);
    sendUpdateStatus({ state: 'error', message });
    return { state: 'error', message };
  };
  const ensureUpdateSupported = () => {
    if (!app.isPackaged || isDev) {
      return handleUnsupportedUpdate();
    }
    return null;
  };
  ipcMain.handle('update-check', async () => {
    const unsupported = ensureUpdateSupported();
    if (unsupported) return unsupported;
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      return handleUpdateError(error);
    }
  });
  ipcMain.handle('update-download', async () => {
    const unsupported = ensureUpdateSupported();
    if (unsupported) return unsupported;
    try {
      return await autoUpdater.downloadUpdate();
    } catch (error) {
      return handleUpdateError(error);
    }
  });
  ipcMain.handle('update-install', async () => {
    const unsupported = ensureUpdateSupported();
    if (unsupported) return unsupported;
    try {
      return await autoUpdater.quitAndInstall();
    } catch (error) {
      return handleUpdateError(error);
    }
  });
  ipcMain.handle('health-check', () => {
    const appRoot = app.getAppPath();
    const indexPath = path.join(appRoot, 'dist', 'index.html');
    return {
      isPackaged: app.isPackaged,
      appPath: appRoot,
      indexPath,
      indexExists: fs.existsSync(indexPath),
    };
  });
};

app.whenReady().then(() => {
  configureOfflineGuards();
  const win = createWindow();
  configureAutoUpdates();
  registerIpc();

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
