const { spawnSync } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { installedPostgresBin } = require('./postgres-tools.cjs')

function secretPath(localAppData) {
  if (!localAppData) throw new Error('Windows AppData could not be found.')
  return path.join(localAppData, 'InternshipHubData', 'secrets', 'db-password.secret')
}

function runPsql(bin, user, database, password, sql, spawnCommand = spawnSync, port = 5432) {
  const result = spawnCommand(path.join(bin, 'psql.exe'), [
    '--no-psqlrc', '--no-password', '--host=127.0.0.1', `--port=${port}`,
    `--username=${user}`, `--dbname=${database}`, '--tuples-only', '--no-align',
    '--set=ON_ERROR_STOP=1', '--file=-',
  ], {
    encoding: 'utf8', windowsHide: true, timeout: 15000, input: `${sql}\n`,
    env: { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: '10' },
  })
  return { ok: !result.error && result.status === 0, output: (result.stdout || '').trim() }
}

function existingCredentialWorks({ localAppData = process.env.LOCALAPPDATA, fileSystem = fs, postgresBin, spawnCommand = spawnSync, port = 5432 } = {}) {
  const file = secretPath(localAppData)
  if (!fileSystem.existsSync(file)) return false
  const password = fileSystem.readFileSync(file, 'utf8').trim()
  if (!password) return false
  try {
    const bin = postgresBin || installedPostgresBin({ fileSystem })
    return runPsql(bin, 'internship_hub', 'internship_hub', password, 'SELECT 1', spawnCommand, port).output === '1'
  } catch { return false }
}

function provisionDatabase({
  adminPassword, existingPassword,
  localAppData = process.env.LOCALAPPDATA,
  fileSystem = fs,
  postgresBin,
  spawnCommand = spawnSync,
  makePassword = () => randomBytes(32).toString('hex'),
  port = 5432,
} = {}) {
  if (typeof adminPassword !== 'string' || !adminPassword) throw new Error('Enter the PostgreSQL administrator password.')
  const bin = postgresBin || installedPostgresBin({ fileSystem })
  const query = (user, database, password, sql) => runPsql(bin, user, database, password, sql, spawnCommand, port)
  const admin = (sql) => query('postgres', 'postgres', adminPassword, sql)
  if (admin('SELECT 1').output !== '1') throw new Error('Could not connect to PostgreSQL as its administrator. Check the service and password.')

  const databaseExists = admin("SELECT 1 FROM pg_database WHERE datname = 'internship_hub'").output === '1'
  const roleExists = admin("SELECT 1 FROM pg_roles WHERE rolname = 'internship_hub'").output === '1'
  const file = secretPath(localAppData)
  const savedPassword = fileSystem.existsSync(file) ? fileSystem.readFileSync(file, 'utf8').trim() : ''

  if (databaseExists) {
    const password = existingPassword || savedPassword
    if (typeof password !== 'string' || !password || query('internship_hub', 'internship_hub', password, 'SELECT 1').output !== '1') {
      throw new Error('An internship_hub database already exists. Enter its existing app-user password; setup will not reset or replace this database.')
    }
    if (password !== savedPassword) savePassword(fileSystem, file, password, Boolean(savedPassword))
    return { reused: true }
  }

  let password = savedPassword
  if (roleExists && password && query('internship_hub', 'postgres', password, 'SELECT 1').output !== '1') {
    password = ''
  }
  if (roleExists && !password) {
    if (typeof existingPassword !== 'string' || !existingPassword || query('internship_hub', 'postgres', existingPassword, 'SELECT 1').output !== '1') {
      throw new Error('The internship_hub login already exists. Enter its existing password; setup will not reset the login.')
    }
    password = existingPassword
  }
  if (!roleExists) {
    password = makePassword()
    if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('Could not generate a safe database password.')
    if (!admin(`CREATE ROLE internship_hub LOGIN PASSWORD '${password}'`).ok) {
      throw new Error('Could not create the app database login.')
    }
    savePassword(fileSystem, file, password, Boolean(savedPassword))
  }
  if (!admin('CREATE DATABASE internship_hub OWNER internship_hub').ok) {
    throw new Error('Could not create the app database. Existing databases were left untouched.')
  }
  if (!fileSystem.existsSync(file) || fileSystem.readFileSync(file, 'utf8').trim() !== password) {
    savePassword(fileSystem, file, password, fileSystem.existsSync(file))
  }
  return { reused: false }
}

function savePassword(fileSystem, file, password, replace = false) {
  fileSystem.mkdirSync(path.dirname(file), { recursive: true })
  fileSystem.writeFileSync(file, `${password}\n`, { flag: replace ? 'w' : 'wx', mode: 0o600 })
}

module.exports = { existingCredentialWorks, provisionDatabase, secretPath }
