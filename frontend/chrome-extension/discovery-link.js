function roleDiscoveryUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if ((host === 'linkedin.com' || host.endsWith('.linkedin.com')) && /^\/jobs\/view\/\d+\/?$/.test(url.pathname)) return url.href
    return null
  } catch { return null }
}

if (typeof module !== 'undefined') module.exports = { roleDiscoveryUrl }
