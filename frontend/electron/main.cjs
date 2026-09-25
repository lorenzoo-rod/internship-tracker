const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('node:path')
const { startPackagedBackend } = require('./backend-launcher.cjs')
const { forwardTrackerRequest } = require('./api-proxy.cjs')
const { createBackup } = require('./backup.cjs')
const { provisionDatabase, secretPath } = require('./database-setup.cjs')
const { parseBrowserDraft } = require('./browser-draft.cjs')
const fs = require('node:fs')
const squirrelStartup = require('electron-squirrel-startup')

let mainWindow
let backend
let apiBase = 'http://127.0.0.1:8080'
let quitting = false
let backupInProgress = false
let setupMode = false
let pendingBrowserDraft = null
let boardReady = false

function installChromeExtensionFiles() {
  const destination = path.join(process.env.LOCALAPPDATA, 'InternshipHubData', 'chrome-extension')
  fs.mkdirSync(destination, { recursive: true })
  for (const name of ['manifest.json', 'popup.html', 'popup.js']) {
    fs.copyFileSync(path.join(__dirname, '..', 'chrome-extension', name), path.join(destination, name))
  }
}

function acceptBrowserLink(commandLine) {
  const draft = commandLine.map(parseBrowserDraft).find(Boolean)
  if (!draft) return
  if (boardReady && mainWindow) mainWindow.webContents.send('tracker:browser-draft', draft)
  else pendingBrowserDraft = draft
  if (mainWindow) { mainWindow.show(); mainWindow.focus() }
}

function isAppWindow(event) {
  return mainWindow && event.sender === mainWindow.webContents && event.senderFrame === mainWindow.webContents.mainFrame
}

function createWindow() {
  boardReady = false
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
    void mainWindow.loadFile(path.join(__dirname, 'startup.html'))
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

ipcMain.handle('tracker:request', (event, request) => {
  if (!isAppWindow(event)) {
    throw new Error('Request did not come from the Internship Hub window')
  }
  if (app.isPackaged && (!backend || backend.child.exitCode !== null)) {
    throw new Error('The local API is not running.')
  }
  return forwardTrackerRequest(request, fetch, apiBase)
})

ipcMain.handle('tracker:take-browser-draft', (event) => {
  if (!isAppWindow(event)) throw new Error('Request did not come from the Internship Hub window')
  boardReady = true
  const draft = pendingBrowserDraft
  pendingBrowserDraft = null
  return draft
})

ipcMain.handle('tracker:backup', async (event) => {
  if (!isAppWindow(event)) throw new Error('Backup request did not come from the Internship Hub window.')
  if (backupInProgress) throw new Error('A backup is already running.')
  backupInProgress = true
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Internship Hub backup',
      defaultPath: path.join(app.getPath('documents'), `internship-hub-${timestamp}.dump`),
      buttonLabel: 'Save backup',
      filters: [{ name: 'PostgreSQL backup', extensions: ['dump'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    return { canceled: false, ...await createBackup({ destination: filePath }) }
  } finally {
    backupInProgress = false
  }
})

ipcMain.handle('tracker:setup-database', async (event, credentials) => {
  if (!isAppWindow(event) || !setupMode) throw new Error('Database setup is not active.')
  if (!credentials || typeof credentials.adminPassword !== 'string' || typeof credentials.existingPassword !== 'string') {
    throw new Error('Enter the requested database credentials.')
  }
  const result = provisionDatabase(credentials)
  setupMode = false
  void openPackagedApp()
  return result
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
      boardReady = false
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
  app.on('second-instance', (_event, commandLine) => {
    acceptBrowserLink(Array.isArray(commandLine) ? commandLine : [])
    if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  })
  app.whenReady().then(() => {
    if (app.isPackaged && process.platform === 'win32') app.setAsDefaultProtocolClient?.('internship-hub')
    if (app.isPackaged && fs.copyFileSync) installChromeExtensionFiles()
    createWindow()
    acceptBrowserLink(process.argv || [])
    if (app.isPackaged) {
      if (!fs.existsSync(secretPath(process.env.LOCALAPPDATA))) {
        setupMode = true
        void mainWindow.loadFile(path.join(__dirname, 'setup.html'))
      } else void openPackagedApp()
    }
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
}

app.on('before-quit', () => { quitting = true; backend?.stop() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
