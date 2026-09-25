const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const { provisionDatabase, existingCredentialWorks } = require('./database-setup.cjs')

function fixture({ database = false, role = false, password = '', saved = '' } = {}) {
  const localAppData = 'C:\\Users\\test\\AppData\\Local'
  const secret = path.join(localAppData, 'InternshipHubData', 'secrets', 'db-password.secret')
  const files = new Map(saved ? [[secret, `${saved}\n`]] : [])
  const calls = []
  const fileSystem = {
    existsSync: (file) => files.has(file),
    readFileSync: (file) => files.get(file),
    mkdirSync: () => {},
    writeFileSync: (file, content, options) => {
      if (options.flag === 'wx' && files.has(file)) throw new Error('already exists')
      files.set(file, content)
    },
  }
  const spawnCommand = (_executable, args, options) => {
    calls.push({ args, options })
    const sql = options.input.trim()
    const user = args.find((arg) => arg.startsWith('--username=')).split('=')[1]
    let output = ''
    let status = 0
    if (user === 'postgres' && options.env.PGPASSWORD !== 'admin') status = 1
    else if (user === 'internship_hub' && (!role || options.env.PGPASSWORD !== password || (args.includes('--dbname=internship_hub') && !database))) status = 1
    else if (sql.includes('FROM pg_database')) output = database ? '1\n' : ''
    else if (sql.includes('FROM pg_roles')) output = role ? '1\n' : ''
    else if (sql.startsWith('CREATE ROLE')) { role = true; password = sql.match(/PASSWORD '([^']+)'/)[1] }
    else if (sql.startsWith('CREATE DATABASE')) database = true
    else output = '1\n'
    return { status, stdout: output }
  }
  return { localAppData, secret, files, calls, fileSystem, spawnCommand, postgresBin: 'D:\\PostgreSQL\\17\\bin', makePassword: () => 'a'.repeat(64) }
}

test('creates a missing app role and database, then keeps the credential on retry', () => {
  const setup = fixture()
  assert.deepEqual(provisionDatabase({ ...setup, adminPassword: 'admin' }), { reused: false })
  assert.equal(setup.files.get(setup.secret), `${'a'.repeat(64)}\n`)
  assert.equal(existingCredentialWorks(setup), true)
  assert.deepEqual(provisionDatabase({ ...setup, adminPassword: 'admin' }), { reused: true })
  assert.equal(setup.calls.filter(({ options }) => options.input.includes('CREATE DATABASE')).length, 1)
  assert.ok(setup.calls.every(({ args }) => args.every((arg) => !arg.includes('admin') && !arg.includes('a'.repeat(64)))))
})

test('preserves an existing database and accepts its existing app password', () => {
  const setup = fixture({ database: true, role: true, password: 'known' })
  assert.deepEqual(provisionDatabase({ ...setup, adminPassword: 'admin', existingPassword: 'known' }), { reused: true })
  assert.equal(setup.files.get(setup.secret), 'known\n')
  assert.ok(setup.calls.every(({ options }) => !options.input.includes('CREATE') && !options.input.includes('DROP')))
})

test('does not modify an existing database when its app password is unknown', () => {
  const setup = fixture({ database: true, role: true, password: 'known' })
  assert.throws(() => provisionDatabase({ ...setup, adminPassword: 'admin', existingPassword: 'wrong' }), /already exists/)
  assert.equal(setup.files.has(setup.secret), false)
  assert.ok(setup.calls.every(({ options }) => !options.input.includes('CREATE') && !options.input.includes('DROP')))
})
