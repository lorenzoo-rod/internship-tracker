const { spawn } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

function startPackagedBackend({
  resourcesPath,
  localAppData = process.env.LOCALAPPDATA,
  spawnProcess = spawn,
  fileSystem = fs,
  nonce = randomUUID(),
  timeoutMs = 45000,
}) {
  if (!localAppData) throw new Error('Windows AppData could not be found.')

  const java = path.join(resourcesPath, 'runtime', 'bin', 'java.exe')
  const jar = path.join(resourcesPath, 'backend.jar')
  const passwordFile = path.join(localAppData, 'InternshipHubData', 'secrets', 'db-password.secret')
  if (!fileSystem.existsSync(java) || !fileSystem.existsSync(jar)) {
    throw new Error('The installed app is missing its Java runtime or API files. Reinstall Internship Hub.')
  }
  if (!fileSystem.existsSync(passwordFile)) {
    throw new Error(`The local database password file is missing: ${passwordFile}`)
  }
  const password = fileSystem.readFileSync(passwordFile, 'utf8').trim()
  if (!password) throw new Error('The local database password file is empty.')

  const child = spawnProcess(java, [
    '-jar', jar,
    '--server.address=127.0.0.1',
    '--server.port=0',
  ], {
    cwd: resourcesPath,
    windowsHide: true,
    env: {
      ...process.env,
      DB_URL: 'jdbc:postgresql://127.0.0.1:5432/internship_hub',
      DB_USER: 'internship_hub',
      DB_PASSWORD: password,
      HUB_DESKTOP_NONCE: nonce,
    },
  })

  let ready = false
  let buffer = ''
  const connection = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('The local API did not start in time. Check that the PostgreSQL service is running.'))
    }, timeoutMs)

    function fail(error) {
      if (ready) return
      clearTimeout(timer)
      reject(error)
    }

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const match = /^INTERNSHIP_HUB_READY ([\w-]+) (\d+)$/.exec(line.trim())
        if (match && match[1] === nonce) {
          const port = Number(match[2])
          if (port < 1 || port > 65535) {
            fail(new Error('The local API reported an invalid port.'))
            return
          }
          ready = true
          clearTimeout(timer)
          resolve({
            baseUrl: `http://127.0.0.1:${port}`,
            child,
            stop: () => { if (child.exitCode === null) child.kill() },
          })
          return
        }
      }
    })
    child.stderr.on('data', () => {})
    child.once('error', (error) => fail(new Error(`The local API could not start: ${error.message}`)))
    child.once('exit', (code) => fail(new Error(`The local API stopped during startup (exit ${code}). Check that the PostgreSQL service is running.`)))
  })

  return connection
}

module.exports = { startPackagedBackend }
