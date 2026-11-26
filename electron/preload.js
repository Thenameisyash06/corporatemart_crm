const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
  defaultCloudUrl: 'https://corporatemartcrm.vercel.app/api',
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  hardReload: () => ipcRenderer.invoke('hard-reload'),
});
