const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const moduleStub = { exports: {} }
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'chrome-extension', 'discovery-link.js'), 'utf8'), { URL, module: moduleStub })
const { roleDiscoveryUrl } = moduleStub.exports

test('captures an individual LinkedIn job page', () => {
  assert.equal(roleDiscoveryUrl('https://www.linkedin.com/jobs/view/123456/?tracking=abc'), 'https://www.linkedin.com/jobs/view/123456/?tracking=abc')
})

test('does not treat a LinkedIn search or home page as a job discovery link', () => {
  assert.equal(roleDiscoveryUrl('https://www.linkedin.com/jobs/'), null)
  assert.equal(roleDiscoveryUrl('https://www.linkedin.com/jobs/search/?keywords=intern'), null)
  assert.equal(roleDiscoveryUrl('https://evil-linkedin.com/jobs/view/123'), null)
})
