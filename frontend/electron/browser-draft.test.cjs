const assert = require('node:assert/strict')
const test = require('node:test')
const { parseBrowserDraft } = require('./browser-draft.cjs')

test('accepts a company application URL and bounded suggestions', () => {
  const draft = parseBrowserDraft('internship-hub://add/?applicationUrl=https%3A%2F%2Fexample.com%2Fapply&title=Intern&company=Example')
  assert.deepEqual(draft, { applicationUrl: 'https://example.com/apply', discoveryUrl: undefined, title: 'Intern', company: 'Example' })
})

test('rejects other actions and unsafe application URLs', () => {
  assert.equal(parseBrowserDraft('internship-hub://delete/?applicationUrl=https://example.com'), null)
  assert.equal(parseBrowserDraft('internship-hub://add/?applicationUrl=javascript:alert(1)'), null)
  assert.equal(parseBrowserDraft('internship-hub://add/?applicationUrl=file:///C:/secret'), null)
})
