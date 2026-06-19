'use strict';

const { contextBridge } = require('electron');

// Expose only what the renderer needs to know about the desktop context.
// Keep this surface minimal — the admin UI is a web app and should work
// identically in both browser and Electron.
contextBridge.exposeInMainWorld('__orbiter__', {
  isDesktop: true,
  platform:  process.platform,
});
