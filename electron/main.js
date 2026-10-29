const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'CorporateMart CRM - Enterprise Desktop Edition',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open external links in default browser rather than electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '../client/dist/index.html');

  // Try loading Vite dev server; if not running, fallback seamlessly to built dist files
  mainWindow.loadURL(devUrl).catch(() => {
    mainWindow.loadFile(prodPath);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
    if (errorCode === -102 || errorCode === -105 || errorCode === -106) {
      // Connection refused/failed on dev server, load local build
      mainWindow.loadFile(prodPath);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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
