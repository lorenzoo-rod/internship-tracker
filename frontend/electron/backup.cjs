const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { installedPostgresBin } = require('./postgres-tools.cjs')

function runTool(executable, args, env, spawnProcess) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(executable, args, {
      env,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-2000) })
    child.once('error', (error) => reject(new Error(`${path.basename(executable)} could not start: ${error.message}`)))
    child.once('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${path.basename(executable)} failed: ${stderr.trim() || `exit ${code}`}`))
    })
  })
}

function isInside(candidate, directory) {
  const relative = path.relative(directory, candidate)
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
}

async function createBackup({
  destination,
  localAppData = process.env.LOCALAPPDATA,
  postgresBin,
  fileSystem = fs,
  spawnProcess = spawn,
  temporaryId = randomUUID(),
  port = 5432,
}) {
  if (!localAppData || typeof destination !== 'string' || !path.isAbsolute(destination)) {
    throw new Error('Choose a full path for the backup file.')
  }
  if (isInside(destination, path.join(localAppData, 'InternshipHub'))) {
    throw new Error('Choose a location outside the app installation folder so updates cannot remove the backup.')
  }
  if (fileSystem.existsSync(destination)) {
    throw new Error('That backup file already exists. Choose a new filename to keep the existing backup.')
  }

  const toolsBin = postgresBin || installedPostgresBin({ fileSystem })
  const pgDump = path.join(toolsBin, 'pg_dump.exe')
  const pgRestore = path.join(toolsBin, 'pg_restore.exe')
  const passwordFile = path.join(localAppData, 'InternshipHubData', 'secrets', 'db-password.secret')
  if (!fileSystem.existsSync(pgDump) || !fileSystem.existsSync(pgRestore)) {
    throw new Error('PostgreSQL backup tools were not found. Check the PostgreSQL 17 installation on this PC.')
  }
  if (!fileSystem.existsSync(passwordFile)) {
    throw new Error('The local database credential is missing. See the backup steps in the project README.')
  }
  const password = fileSystem.readFileSync(passwordFile, 'utf8').trim()
  if (!password) throw new Error('The local database credential is empty.')

  const temporary = path.join(path.dirname(destination), `.${path.basename(destination)}.${temporaryId}.partial`)
  try {
    await runTool(pgDump, [
      '--format=custom', '--no-password', '--host=127.0.0.1', `--port=${port}`,
      '--username=internship_hub', '--dbname=internship_hub', `--file=${temporary}`,
    ], { ...process.env, PGPASSWORD: password, PGCONNECT_TIMEOUT: '10' }, spawnProcess)

    if (!fileSystem.existsSync(temporary) || fileSystem.statSync(temporary).size === 0) {
      throw new Error('PostgreSQL did not create a backup archive.')
    }
    await runTool(pgRestore, ['--list', temporary], { ...process.env }, spawnProcess)
    if (fileSystem.existsSync(destination)) {
      throw new Error('That backup file already exists. Choose a new filename to keep the existing backup.')
    }
    fileSystem.renameSync(temporary, destination)
    return { path: destination, bytes: fileSystem.statSync(destination).size }
  } finally {
    if (fileSystem.existsSync(temporary)) fileSystem.unlinkSync(temporary)
  }
}

module.exports = { createBackup }
