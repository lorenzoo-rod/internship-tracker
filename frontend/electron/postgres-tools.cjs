const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

function installedPostgresBin({
  fileSystem = fs,
  queryRegistry = (key) => execFileSync('reg.exe', ['query', key, '/s'], { encoding: 'utf8', windowsHide: true }),
} = {}) {
  const root = 'HKLM\\SOFTWARE\\PostgreSQL\\Installations'
  let output
  try { output = queryRegistry(root) } catch {
    throw new Error('PostgreSQL 17 installation details were not found. Repair or install PostgreSQL 17, then reopen Internship Hub.')
  }

  const entries = output.split(/(?=^HKEY_)/m)
  for (const entry of entries) {
    if (!/^\s*Version\s+REG_SZ\s+17(?:\.|\s|$)/m.test(entry)) continue
    const base = /^\s*Base Directory\s+REG_SZ\s+(.+)$/m.exec(entry)?.[1]?.trim()
    if (!base) continue
    const bin = path.join(base, 'bin')
    if (['pg_dump.exe', 'pg_restore.exe', 'psql.exe'].every((tool) => fileSystem.existsSync(path.join(bin, tool)))) return bin
  }
  throw new Error('PostgreSQL 17 command-line tools were not found. Repair the PostgreSQL 17 installation, then reopen Internship Hub.')
}

module.exports = { installedPostgresBin }
