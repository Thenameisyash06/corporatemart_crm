const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
const CLOUD_APP_URL = 'https://corporatemartcrm.vercel.app';
const prodFile = path.join(__dirname, '../client/dist/index.html');
const devUrl = 'http://localhost:5173';

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

// Fallback to local files if cloud connection fails
function loadWithFallback(win, targetUrl) {
  if (!win || win.isDestroyed()) return;
  win.loadURL(targetUrl).catch((err) => {
    console.warn('[Desktop] Cloud connection failed, loading local build:', err.message);
    if (!win.isDestroyed()) {
      win.loadFile(prodFile).catch((e) => {
        console.error('[Desktop] Failed to load local fallback:', e);
      });
    }
  });
}

// Load appropriate target URL based on packaged/dev state
function loadTargetApp(win) {
  if (!win || win.isDestroyed()) return;
  if (app.isPackaged) {
    // In production desktop package, load live cloud app
    loadWithFallback(win, CLOUD_APP_URL);
  } else {
    // In local dev mode, check if Vite dev server is running on 5173 first
    isServerRunning(5173, '/').then((running) => {
      if (!win || win.isDestroyed()) return;
      if (running) {
        win.loadURL(devUrl);
      } else {
        loadWithFallback(win, CLOUD_APP_URL);
      }
    });
  }
}

/**
 * Deep Hard Refresh:
 * 1. Clear Chromium HTTP memory & disk cache
 * 2. Clear service workers, cache storage, shader cache
 * 3. Reload ignoring cache (or reload target URL if blank/error)
 */
async function performHardRefresh(targetWindow) {
  const win = targetWindow || mainWindow;
  if (!win || win.isDestroyed()) return;

  try {
    console.log('[Desktop] Performing deep hard refresh: clearing session cache & storage...');
    await win.webContents.session.clearCache();
    await win.webContents.session.clearStorageData({
      storages: ['cachestorage', 'serviceworkers', 'shadercache'],
    });
  } catch (err) {
    console.warn('[Desktop] Cache clear notice:', err.message);
  }

  if (!win.isDestroyed()) {
    const currentUrl = win.webContents.getURL();
    console.log('[Desktop] Reloading URL ignoring cache:', currentUrl || 'target app');
    if (!currentUrl || currentUrl === 'about:blank') {
      loadTargetApp(win);
    } else {
      win.webContents.reloadIgnoringCache();
    }
  }
}

/**
 * Configure native application menu with hidden accelerators
 * Keeps the UI clean and frameless while ensuring shortcuts (Ctrl+Shift+R, Ctrl+F5, F5, F12)
 * work natively at the operating system level.
 */
function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { role: isMac ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.reload();
          },
        },
        {
          label: 'Reload (F5)',
          accelerator: 'F5',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.reload();
          },
        },
        {
          label: 'Hard Reload (Clear Cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (item, focusedWindow) => {
            performHardRefresh(focusedWindow);
          },
        },
        {
          label: 'Hard Reload (Ctrl+F5)',
          accelerator: 'CmdOrCtrl+F5',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: (item, focusedWindow) => {
            performHardRefresh(focusedWindow);
          },
        },
        {
          label: 'Hard Reload (Shift+F5)',
          accelerator: 'Shift+F5',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: (item, focusedWindow) => {
            performHardRefresh(focusedWindow);
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
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

  // Setup application menu with native accelerators
  setupApplicationMenu();

  // Show window smoothly once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Direct keyboard event capture for window input
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isMac = process.platform === 'darwin';
      const isModifier = isMac ? input.meta : input.control;
      const isKeyR = (input.key && input.key.toLowerCase() === 'r') || input.code === 'KeyR';
      const isKeyF5 = input.key === 'F5' || input.code === 'F5';

      // 1. Hard Reload shortcuts: Ctrl+Shift+R, Cmd+Shift+R, Ctrl+F5, Shift+F5
      if ((isModifier && input.shift && isKeyR) || (isModifier && isKeyF5) || (input.shift && isKeyF5)) {
        event.preventDefault();
        console.log('[Desktop] Hard Reload keyboard shortcut detected');
        performHardRefresh(mainWindow);
        return;
      }

      // 2. Normal Reload shortcuts: Ctrl+R, Cmd+R, F5
      if ((isModifier && !input.shift && isKeyR) || (!isModifier && !input.shift && isKeyF5)) {
        event.preventDefault();
        console.log('[Desktop] Normal Reload keyboard shortcut detected');
        mainWindow.webContents.reload();
        return;
      }

      // 3. DevTools shortcuts: F12 or Ctrl+Shift+I / Cmd+Option+I
      const isKeyI = (input.key && input.key.toLowerCase() === 'i') || input.code === 'KeyI';
      const isKeyF12 = input.key === 'F12' || input.code === 'F12';
      if (isKeyF12 || (isModifier && input.shift && isKeyI)) {
        event.preventDefault();
        mainWindow.webContents.toggleDevTools();
        return;
      }
    }
  });

  // Right-click context menu (Reload, Hard Reload, Inspect, Clipboard)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => mainWindow.webContents.reload(),
      },
      {
        label: 'Hard Reload (Clear Cache)',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: () => performHardRefresh(mainWindow),
      },
      { type: 'separator' },
      { role: 'cut', enabled: params.editFlags.canCut },
      { role: 'copy', enabled: params.editFlags.canCopy },
      { role: 'paste', enabled: params.editFlags.canPaste },
      { role: 'selectAll' },
      { type: 'separator' },
      {
        label: 'Inspect Element',
        accelerator: 'F12',
        click: () => mainWindow.webContents.inspectElement(params.x, params.y),
      },
    ]);
    contextMenu.popup({ window: mainWindow });
  });

  // Open external links (e.g. documentation, government portals) in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load app into main window
  loadTargetApp(mainWindow);

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

ipcMain.handle('hard-reload', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[Desktop] Hard reload requested via IPC');
    await performHardRefresh(mainWindow);
    return true;
  }
  return false;
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
