const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('trackerApi', {
  request: (path, method, body) => ipcRenderer.invoke('tracker:request', { path, method, body }),
  backup: () => ipcRenderer.invoke('tracker:backup'),
  onBrowserDraft: (callback) => {
    const listener = (_event, draft) => callback(draft)
    ipcRenderer.on('tracker:browser-draft', listener)
    ipcRenderer.invoke('tracker:take-browser-draft').then((draft) => { if (draft) callback(draft) })
    return () => ipcRenderer.removeListener('tracker:browser-draft', listener)
  },
  setupDatabase: (adminPassword, existingPassword) => ipcRenderer.invoke('tracker:setup-database', { adminPassword, existingPassword }),
})
