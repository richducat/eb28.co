const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('missionControl', { desktop: true, platform: process.platform });
