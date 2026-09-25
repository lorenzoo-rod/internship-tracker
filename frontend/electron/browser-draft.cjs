function validWebUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? value : null
  } catch { return null }
}

function parseBrowserDraft(argument) {
  if (typeof argument !== 'string' || argument.length > 7000) return null
  try {
    const deepLink = new URL(argument)
    if (deepLink.protocol !== 'internship-hub:' || deepLink.hostname !== 'add' || deepLink.pathname !== '/') return null
    const applicationUrl = validWebUrl(deepLink.searchParams.get('applicationUrl'))
    if (!applicationUrl) return null
    const discoveryUrl = validWebUrl(deepLink.searchParams.get('discoveryUrl'))
    const suggestion = (name) => (deepLink.searchParams.get(name) || '').slice(0, 255).trim()
    return { applicationUrl, discoveryUrl: discoveryUrl || undefined, title: suggestion('title'), company: suggestion('company') }
  } catch { return null }
}

module.exports = { parseBrowserDraft }
