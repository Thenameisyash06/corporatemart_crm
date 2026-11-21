const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
const CLOUD_APP_URL = 'https://corporatemartcrm.vercel.app';

// Helper to check if a local development server is running on a port
function isServerRunning(port = 5173, checkPath = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${checkPath}`, () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CorporateMart CRM',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow cross-origin requests to Vercel cloud API from local files
    },
  });

  // Remove default menu bar for clean native app appearance
  Menu.setApplicationMenu(null);

  // Show window smoothly once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (e.g. documentation, government portals) in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const prodFile = path.join(__dirname, '../client/dist/index.html');
  const devUrl = 'http://localhost:5173';

  // Fallback to local files if cloud connection fails
  const loadWithFallback = (targetUrl) => {
    mainWindow.loadURL(targetUrl).catch((err) => {
      console.warn('[Desktop] Cloud connection failed, loading local build:', err.message);
      mainWindow.loadFile(prodFile).catch((e) => {
        console.error('[Desktop] Failed to load local fallback:', e);
      });
    });
  };

  if (app.isPackaged) {
    // In production desktop package, load live cloud app so any code pushed by developers reflects immediately
    loadWithFallback(CLOUD_APP_URL);
  } else {
    // In local dev mode, check if Vite dev server is running on 5173 first
    isServerRunning(5173, '/').then((running) => {
      if (!mainWindow) return;
      if (running) {
        mainWindow.loadURL(devUrl);
      } else {
        loadWithFallback(CLOUD_APP_URL);
      }
    });
  }

  // Handle network failure during navigation
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode !== -3 && mainWindow && !mainWindow.isDestroyed()) { // -3 is ABORTED
      console.warn(`[Desktop] Page failed to load (${errorCode}: ${errorDescription}), falling back to local files.`);
      mainWindow.loadFile(prodFile).catch(() => {});
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('open-external', async (_, url) => {
  if (url && typeof url === 'string') {
    shell.openExternal(url);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
