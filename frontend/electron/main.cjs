const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('node:path')
const { startPackagedBackend } = require('./backend-launcher.cjs')
const { forwardTrackerRequest } = require('./api-proxy.cjs')
const squirrelStartup = require('electron-squirrel-startup')

let mainWindow
let backend
let apiBase = 'http://127.0.0.1:8080'
let quitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'Internship Hub',
    backgroundColor: '#f7f5ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
  mainWindow.on('closed', () => { mainWindow = null })
  if (app.isPackaged) {
    void mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#f7f5ef;color:#233128;font:20px system-ui">
        Starting Internship Hub…
      </body></html>`))
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('tracker:request', (event, request) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Request did not come from the Internship Hub window')
  }
  if (app.isPackaged && (!backend || backend.child.exitCode !== null)) {
    throw new Error('The local API is not running.')
  }
  return forwardTrackerRequest(request, fetch, apiBase)
})

async function openPackagedApp() {
  while (!quitting) {
    try {
      backend = await startPackagedBackend({ resourcesPath: process.resourcesPath })
      if (quitting) {
        backend.stop()
        return
      }
      apiBase = backend.baseUrl
      backend.child.once('exit', () => {
        if (!quitting) {
          dialog.showErrorBox('Internship Hub stopped', 'The local API stopped. Check the PostgreSQL service, then reopen Internship Hub.')
          app.quit()
        }
      })
      await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
      return
    } catch (error) {
      if (quitting) return
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Could not start Internship Hub',
        message: error instanceof Error ? error.message : 'The local API could not start.',
        detail: 'Check that the PostgreSQL service is running. Your saved cards remain in the local database.',
        buttons: ['Retry', 'Quit'],
        defaultId: 0,
        cancelId: 1,
      })
      if (response !== 0) app.quit()
    }
  }
}

if (squirrelStartup || !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus() } })
  app.whenReady().then(() => {
    createWindow()
    if (app.isPackaged) void openPackagedApp()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
}

app.on('before-quit', () => { quitting = true; backend?.stop() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
