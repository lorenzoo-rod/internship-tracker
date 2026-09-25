const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('trackerApi', {
  request: (path, method, body) => ipcRenderer.invoke('tracker:request', { path, method, body }),
  backup: () => ipcRenderer.invoke('tracker:backup'),
  setupDatabase: (adminPassword, existingPassword) => ipcRenderer.invoke('tracker:setup-database', { adminPassword, existingPassword }),
})
