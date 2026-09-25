const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function runPackagedMain(startBackend, onError = async () => ({ response: 0 })) {
  const windows = []
  const dialogs = []
  const appHandlers = {}
  const ipcHandlers = {}
  let quitCount = 0
  class Window {
    constructor() {
      this.loaded = []
      this.webContents = {
        mainFrame: {},
        setWindowOpenHandler() {},
        on() {},
        sent: [],
        send(channel, draft) { this.sent.push({ channel, draft }) },
      }
      windows.push(this)
    }
    on() {}
    show() {}
    focus() {}
    loadFile(file) { this.loaded.push(path.basename(file)); return Promise.resolve() }
  }
  Window.getAllWindows = () => windows
  const app = {
    isPackaged: true,
    requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(),
    on(name, handler) { appHandlers[name] = handler },
    quit() { quitCount += 1 },
  }
  const fakeElectron = {
    app,
    BrowserWindow: Window,
    dialog: {
      async showMessageBox(_window, options) { dialogs.push(options); return onError(options) },
      showErrorBox() {},
    },
    ipcMain: { handle(name, handler) { ipcHandlers[name] = handler } },
    shell: { openExternal() {} },
  }
  const modules = {
    electron: fakeElectron,
    'node:path': path,
    'node:fs': { existsSync: () => true },
    './backend-launcher.cjs': { startPackagedBackend: startBackend },
    './api-proxy.cjs': { forwardTrackerRequest() {} },
    './backup.cjs': { createBackup() {} },
    './database-setup.cjs': { provisionDatabase() {}, secretPath: () => 'credential' },
    './browser-draft.cjs': require('./browser-draft.cjs'),
    'electron-squirrel-startup': false,
  }
  const source = fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8')
  vm.runInNewContext(source, {
    require: (name) => modules[name],
    __dirname,
    process: { resourcesPath: 'C:\\test\\resources', env: { LOCALAPPDATA: 'C:\\test' }, platform: 'win32' },
    Error,
    fetch() {},
  })
  return { windows, dialogs, appHandlers, ipcHandlers, get quitCount() { return quitCount } }
}

function readyBackend() {
  const child = new EventEmitter()
  child.exitCode = null
  return { baseUrl: 'http://127.0.0.1:41234', child, stop() {} }
}

async function settle() { await new Promise(setImmediate) }

test('packaged launch shows startup then the board when the API is ready', async () => {
  const launch = runPackagedMain(async () => readyBackend())
  await settle()
  assert.deepEqual(launch.windows[0].loaded, ['startup.html', 'index.html'])
  assert.equal(launch.dialogs.length, 0)
})

test('slow API keeps the startup screen visible until readiness', async () => {
  const pending = deferred()
  const launch = runPackagedMain(() => pending.promise)
  await settle()
  assert.deepEqual(launch.windows[0].loaded, ['startup.html'])
  pending.resolve(readyBackend())
  await settle()
  assert.deepEqual(launch.windows[0].loaded, ['startup.html', 'index.html'])
})

test('startup failure offers retry and retains the screen until retry succeeds', async () => {
  const pending = deferred()
  let attempts = 0
  const launch = runPackagedMain(() => {
    attempts += 1
    return attempts === 1 ? Promise.reject(new Error('Test startup failure')) : pending.promise
  })
  await settle()
  assert.deepEqual(launch.windows[0].loaded, ['startup.html'])
  assert.equal(launch.dialogs.length, 1)
  assert.equal(launch.dialogs[0].message, 'Test startup failure')
  assert.deepEqual(Array.from(launch.dialogs[0].buttons), ['Retry', 'Quit'])
  assert.equal(attempts, 2)
  pending.resolve(readyBackend())
  await settle()
  assert.deepEqual(launch.windows[0].loaded, ['startup.html', 'index.html'])
  assert.equal(launch.quitCount, 0)
})

test('a browser link opens a review draft through the restricted bridge', async () => {
  const launch = runPackagedMain(async () => readyBackend())
  await settle()
  const window = launch.windows[0]
  const event = { sender: window.webContents, senderFrame: window.webContents.mainFrame }
  assert.equal(launch.ipcHandlers['tracker:take-browser-draft'](event), null)
  launch.appHandlers['second-instance']({}, [
    'InternshipHub.exe',
    'internship-hub://add/?applicationUrl=https%3A%2F%2Fexample.com%2Fapply&title=Intern&company=Example',
  ])
  assert.equal(window.webContents.sent.length, 1)
  assert.equal(window.webContents.sent[0].channel, 'tracker:browser-draft')
  assert.equal(window.webContents.sent[0].draft.applicationUrl, 'https://example.com/apply')
})
