const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const path = require('node:path')
const { PassThrough } = require('node:stream')
const test = require('node:test')
const { createBackup } = require('./backup.cjs')

function setup(restoreCode = 0) {
  const localAppData = 'C:\\Users\\test\\AppData\\Local'
  const postgresBin = 'C:\\Program Files\\PostgreSQL\\17\\bin'
  const destination = 'C:\\Users\\test\\Documents\\internship-hub.dump'
  const files = new Map([
    [path.join(postgresBin, 'pg_dump.exe'), ''],
    [path.join(postgresBin, 'pg_restore.exe'), ''],
    [path.join(localAppData, 'InternshipHubData', 'secrets', 'db-password.secret'), 'private-password\n'],
  ])
  const calls = []
  const fileSystem = {
    existsSync: (file) => files.has(file),
    readFileSync: (file) => files.get(file),
    statSync: (file) => ({ size: files.get(file).length }),
    renameSync: (from, to) => { files.set(to, files.get(from)); files.delete(from) },
    unlinkSync: (file) => files.delete(file),
  }
  const spawnProcess = (executable, args, options) => {
    calls.push({ executable, args, options })
    const child = new EventEmitter()
    child.stderr = new PassThrough()
    queueMicrotask(() => {
      if (executable.endsWith('pg_dump.exe')) {
        files.set(args.find((arg) => arg.startsWith('--file=')).slice('--file='.length), 'CUSTOM ARCHIVE')
        child.emit('close', 0)
      } else {
        if (restoreCode !== 0) child.stderr.write('archive is invalid')
        child.emit('close', restoreCode)
      }
    })
    return child
  }
  return { localAppData, postgresBin, destination, files, calls, fileSystem, spawnProcess }
}

test('creates and verifies a backup before moving it to the chosen path', async () => {
  const config = setup()
  const result = await createBackup({ ...config, temporaryId: 'test-id' })
  assert.deepEqual(result, { path: config.destination, bytes: 14 })
  assert.equal(config.files.get(config.destination), 'CUSTOM ARCHIVE')
  assert.equal(config.calls.length, 2)
  assert.equal(config.calls[0].options.env.PGPASSWORD, 'private-password')
  assert.ok(config.calls[0].args.every((arg) => !arg.includes('private-password')))
  assert.equal(config.calls[1].options.env.PGPASSWORD, undefined)
  assert.ok([...config.files.keys()].every((file) => !file.endsWith('.partial')))
})

test('never overwrites an existing backup', async () => {
  const config = setup()
  config.files.set(config.destination, 'OLD BACKUP')
  await assert.rejects(createBackup(config), /already exists/)
  assert.equal(config.files.get(config.destination), 'OLD BACKUP')
  assert.equal(config.calls.length, 0)
})

test('removes a failed temporary archive and reports verification failure', async () => {
  const config = setup(1)
  await assert.rejects(createBackup({ ...config, temporaryId: 'failed' }), /archive is invalid/)
  assert.equal(config.files.has(config.destination), false)
  assert.ok([...config.files.keys()].every((file) => !file.endsWith('.partial')))
})

test('rejects the replaceable application folder', async () => {
  const config = setup()
  await assert.rejects(createBackup({ ...config, destination: path.join(config.localAppData, 'InternshipHub', 'backup.dump') }), /outside the app installation/)
})
