const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Pre-load environment variables
const envPath = path.join(__dirname, '../.env');
try {
  require('dotenv').config({ path: envPath });
} catch (e) {}

let mainWindow = null;
let serverInstance = null;

// Static require so electron-builder packs all backend dependencies
let expressApp = null;
try {
  expressApp = require('../src/server.js');
} catch (err) {
  console.error('[Desktop] Failed to require server.js:', err);
}

// Helper to check if a server is running on a port
function isServerRunning(port = 4000, checkPath = '/api/health') {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${checkPath}`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start backend Express server non-blockingly in the background
async function startBackgroundServer(port = 4000) {
  try {
    const running = await isServerRunning(port);
    if (running) {
      console.log(`[Desktop] Server is already running on port ${port}.`);
      return;
    }

    if (expressApp) {
      console.log(`[Desktop] Starting embedded API server on port ${port}...`);
      serverInstance = expressApp.listen(port, () => {
        console.log(`[Desktop] Embedded Express API ready on http://localhost:${port}`);
      });

      serverInstance.on('error', (err) => {
        if (err.code !== 'EADDRINUSE') {
          console.error('[Desktop] Server error:', err.message);
        }
      });
    } else {
      console.error('[Desktop] expressApp is not loaded, cannot start embedded server.');
    }
  } catch (err) {
    console.error('[Desktop] Non-fatal server startup notice:', err.message);
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CorporateMart CRM',
    backgroundColor: '#020617',
    show: true,
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Open external links in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const prodFile = path.join(__dirname, '../client/dist/index.html');
  const devUrl = 'http://localhost:5173';

  if (app.isPackaged) {
    // In compiled .exe application, load local production build directly
    mainWindow.loadFile(prodFile).catch((err) => {
      console.error('[Desktop] Error loading index.html:', err);
    });
  } else {
    // In local dev, check if Vite dev server is running on 5173 first
    isServerRunning(5173, '/').then((running) => {
      if (!mainWindow) return;
      if (running) {
        mainWindow.loadURL(devUrl);
      } else {
        mainWindow.loadFile(prodFile).catch((err) => {
          console.error('[Desktop] Error loading index.html:', err);
        });
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  await startBackgroundServer(4000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (serverInstance) {
    try {
      serverInstance.close();
    } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
