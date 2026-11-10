// Engine Room API client. Runs in the main process only.
const TIMEOUT_MS = 15000
const NOT_SET_UP = "Engine Room isn't set up. Open ⚙ Settings → Engine Room."
const UNREACHABLE = "Couldn't reach Engine Room. Check the address and your internet."
const HTTPS_ONLY = 'Use the https:// address for Engine Room.'
const NOT_ENGINE_ROOM = "That address isn't Engine Room. Check it in ⚙ Settings → Engine Room."
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

// The connection code travels in the header, so only https (or a dev server on this machine) may carry it.
function addressAllowed(url) {
  let parsed
  try { parsed = new URL(url) } catch { return false }
  if (parsed.protocol === 'https:') return true
  return parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname)
}

async function request(settings, path, method, body, fetchImpl) {
  const url = settings && typeof settings.url === 'string' ? settings.url.trim() : ''
  const code = settings && typeof settings.code === 'string' ? settings.code.trim() : ''
  if (!url || !code) return { success: false, error: NOT_SET_UP }
  if (!addressAllowed(url)) return { success: false, error: HTTPS_ONLY }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${url.replace(/\/+$/, '')}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${code}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      redirect: 'error',
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const error = json && typeof json.error === 'string' && json.error ? json.error : `HTTP ${res.status}`
      return { success: false, error }
    }
    return { success: true, json }
  } catch {
    return { success: false, error: UNREACHABLE }
  } finally {
    clearTimeout(timer)
  }
}

async function getSquad(settings, fetchImpl = fetch) {
  const r = await request(settings, '/api/analyst/squad', 'GET', undefined, fetchImpl)
  if (!r.success) return r
  if (!Array.isArray(r.json?.players)) return { success: false, error: NOT_ENGINE_ROOM }
  return { success: true, players: r.json.players }
}

async function sendMatch(settings, payload, fetchImpl = fetch) {
  const r = await request(settings, '/api/analyst/match', 'POST', payload, fetchImpl)
  if (!r.success) return r
  if (typeof r.json?.matchId !== 'string') return { success: false, error: NOT_ENGINE_ROOM }
  return { success: true, message: r.json.message, unknown: r.json.unknown }
}

module.exports = { getSquad, sendMatch }
