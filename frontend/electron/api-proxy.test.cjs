const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const { forwardTrackerRequest } = require('./api-proxy.cjs')

test('forwards only the tracker API methods and paths', async () => {
  const calls = []
  const fetcher = async (url, options) => {
    calls.push({ url, options })
    return { status: 201, text: async () => '{"id":1,"stage":"SAVED"}' }
  }

  const result = await forwardTrackerRequest({
    path: '/api/opportunities',
    method: 'POST',
    body: '{"title":"Intern"}',
  }, fetcher)
  assert.deepEqual(result, { status: 201, body: { id: 1, stage: 'SAVED' } })
  assert.equal(calls[0].url, 'http://127.0.0.1:8080/api/opportunities')

  await forwardTrackerRequest({ path: '/api/opportunities', method: 'GET' }, fetcher, 'http://127.0.0.1:40123')
  assert.equal(calls[1].url, 'http://127.0.0.1:40123/api/opportunities')

  await forwardTrackerRequest({ path: '/api/opportunities/1', method: 'PATCH', body: '{"title":"Intern"}' }, fetcher)
  await forwardTrackerRequest({ path: '/api/opportunities/1', method: 'DELETE', body: null }, fetcher)
  assert.equal(calls[3].options.body, undefined)
  assert.equal(calls[3].options.headers, undefined)

  await assert.rejects(() => forwardTrackerRequest({ path: 'https://example.com', method: 'GET' }, fetcher))
  await assert.rejects(() => forwardTrackerRequest({ path: '/api/opportunities/1', method: 'DELETE', body: '{}' }, fetcher))
  await assert.rejects(() => forwardTrackerRequest({ path: '/api/opportunities/1/stage', method: 'PATCH' }, fetcher))
  assert.equal(calls.length, 4)
})

test('preload exposes only the tracker request and backup bridge', async () => {
  let exposed
  let invoked
  const electron = {
    contextBridge: { exposeInMainWorld: (name, api) => { exposed = { name, api } } },
    ipcRenderer: { invoke: async (channel, request) => { invoked = { channel, request }; return { status: 200, body: [] } } },
  }
  const preload = fs.readFileSync(path.join(__dirname, 'preload.cjs'), 'utf8')
  vm.runInNewContext(preload, { require: () => electron })

  assert.equal(exposed.name, 'trackerApi')
  assert.deepEqual(Object.keys(exposed.api), ['request', 'backup'])
  await exposed.api.request('/api/opportunities', 'GET', null)
  assert.equal(invoked.channel, 'tracker:request')
  assert.equal(invoked.request.path, '/api/opportunities')
  assert.equal(invoked.request.method, 'GET')
  await exposed.api.backup()
  assert.equal(invoked.channel, 'tracker:backup')
})
