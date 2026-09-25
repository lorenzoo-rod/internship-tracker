const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const { installedPostgresBin } = require('./postgres-tools.cjs')

test('finds PostgreSQL tools through installation registry metadata', () => {
  const base = 'D:\\PostgreSQL\\17'
  const bin = path.join(base, 'bin')
  const result = installedPostgresBin({
    queryRegistry: () => `HKEY_LOCAL_MACHINE\\SOFTWARE\\PostgreSQL\\Installations\\postgresql-x64-17\n    Base Directory    REG_SZ    ${base}\n    Version    REG_SZ    17.11-4\n`,
    fileSystem: { existsSync: (file) => file.startsWith(bin) },
  })
  assert.equal(result, bin)
})

test('does not select another PostgreSQL major version', () => {
  assert.throws(() => installedPostgresBin({
    queryRegistry: () => 'HKEY_LOCAL_MACHINE\\SOFTWARE\\PostgreSQL\\Installations\\postgresql-x64-18\n    Base Directory    REG_SZ    C:\\PostgreSQL\\18\n    Version    REG_SZ    18.1-1\n',
    fileSystem: { existsSync: () => true },
  }), /PostgreSQL 17 command-line tools/)
})
