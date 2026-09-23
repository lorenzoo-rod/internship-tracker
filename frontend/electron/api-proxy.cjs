const API_BASE = 'http://127.0.0.1:8080'

function isAllowedRequest(path, method) {
  if (method === 'GET') return /^\/api\/opportunities(?:\/\d+)?$/.test(path)
  if (method === 'POST') return path === '/api/opportunities'
  if (method === 'PATCH') return /^\/api\/opportunities\/\d+(?:\/stage)?$/.test(path)
  if (method === 'DELETE') return /^\/api\/opportunities\/\d+$/.test(path)
  return false
}

async function forwardTrackerRequest(request, fetcher = fetch, apiBase = API_BASE) {
  const { path, method, body } = request ?? {}
  if (typeof path !== 'string' || !isAllowedRequest(path, method)) {
    throw new Error('Unsupported tracker API request')
  }
  if ((method === 'POST' || method === 'PATCH') && (typeof body !== 'string' || body.length > 8192)) {
    throw new Error('Invalid tracker API request body')
  }
  if (method === 'DELETE' && body != null) throw new Error('Invalid tracker API request body')

  const response = await fetcher(`${apiBase}${path}`, {
    method,
    headers: method === 'POST' || method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' || method === 'PATCH' ? body : undefined,
  })
  const text = await response.text()
  let responseBody
  try {
    responseBody = JSON.parse(text)
  } catch {
    responseBody = { message: response.statusText }
  }
  return { status: response.status, body: responseBody }
}

module.exports = { forwardTrackerRequest, isAllowedRequest }
