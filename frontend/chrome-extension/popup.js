function pageDetails() {
  const meta = (name) => document.querySelector(`meta[property="${name}"]`)?.content || ''
  return { title: meta('og:title') || document.title || '', company: meta('og:site_name') || '', referrer: document.referrer || '' }
}

async function prepare() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const page = document.getElementById('page')
  const open = document.getElementById('open')
  if (!tab?.id || !/^https?:\/\//i.test(tab.url || '')) {
    page.textContent = 'Open a company application page, then click this extension.'
    return
  }
  let details = { title: tab.title || '', company: '', referrer: '' }
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageDetails })
    if (result?.result) details = result.result
  } catch { /* Some pages block page inspection; the URL and tab title still work. */ }

  const url = new URL('internship-hub://add/')
  url.searchParams.set('applicationUrl', tab.url)
  url.searchParams.set('title', details.title.slice(0, 255))
  url.searchParams.set('company', details.company.slice(0, 255))
  const discoveryUrl = roleDiscoveryUrl(details.referrer)
  if (discoveryUrl) url.searchParams.set('discoveryUrl', discoveryUrl)
  page.textContent = tab.url
  open.href = url.href
  open.hidden = false
}

prepare().catch(() => {
  document.getElementById('page').textContent = 'Could not read this tab. Try reloading the page.'
})
