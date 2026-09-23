const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { PassThrough } = require('node:stream')
const test = require('node:test')
const { startPackagedBackend } = require('./backend-launcher.cjs')

function fakeChild() {
  const child = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.exitCode = null
  child.kill = () => { child.exitCode = 0 }
  return child
}

function options(child, onSpawn = () => {}) {
  return {
    resourcesPath: 'C:\\app\\resources',
    localAppData: 'C:\\Users\\test\\AppData\\Local',
    nonce: 'launch-token',
    timeoutMs: 1000,
    fileSystem: { existsSync: () => true, readFileSync: () => 'private-password\n' },
    spawnProcess: (java, args, settings) => { onSpawn(java, args, settings); return child },
  }
}

test('starts a bundled API and accepts only its matching readiness signal', async () => {
  const child = fakeChild()
  let settings
  const config = options(child, (_java, args, spawnSettings) => {
    assert.deepEqual(args.slice(-2), ['--server.address=127.0.0.1', '--server.port=0'])
    settings = spawnSettings
  })
  config.fileSystem.readFileSync = (file) => {
    assert.match(file, /InternshipHubData[\\/]secrets[\\/]db-password\.secret$/)
    return 'private-password\n'
  }
  const connection = startPackagedBackend(config)

  child.stdout.write('INTERNSHIP_HUB_READY another-token 40000\n')
  child.stdout.write('INTERNSHIP_HUB_READY launch-token ')
  child.stdout.write('40123\n')
  const backend = await connection
  assert.equal(backend.baseUrl, 'http://127.0.0.1:40123')
  assert.equal(settings.env.DB_PASSWORD, 'private-password')
  assert.equal(settings.env.HUB_DESKTOP_NONCE, 'launch-token')
  backend.stop()
  assert.equal(child.exitCode, 0)
})

test('reports an API exit before readiness', async () => {
  const child = fakeChild()
  const connection = startPackagedBackend(options(child))
  child.emit('exit', 1)
  await assert.rejects(connection, /PostgreSQL service/)
})

test('refuses to start when the local password is missing', () => {
  const child = fakeChild()
  const config = options(child)
  config.fileSystem.existsSync = (file) => !file.endsWith('db-password.secret')
  assert.throws(() => startPackagedBackend(config), /password file is missing/)
})
