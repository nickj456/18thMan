import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { getSquad, sendMatch } = require('./engineRoomClient.js')

const settings = { url: 'https://er.example.com/', code: 'abc123' }
const okResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('getSquad', () => {
  it('builds the URL without a double slash and sets the Bearer header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ players: [{ id: '1', name: 'A', position: 'back', sameName: false }] }))
    const res = await getSquad(settings, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://er.example.com/api/analyst/squad')
    expect(opts.headers.Authorization).toBe('Bearer abc123')
    expect(res).toEqual({ success: true, players: [{ id: '1', name: 'A', position: 'back', sameName: false }] })
  })

  it('returns the server error text on a 401', async () => {
    const msg = 'Wrong or old connection code. Copy it again from Engine Room.'
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ error: msg }, 401))
    expect(await getSquad(settings, fetchImpl)).toEqual({ success: false, error: msg })
  })

  it('falls back to HTTP status when the body has no error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => { throw new Error('no json') } })
    expect(await getSquad(settings, fetchImpl)).toEqual({ success: false, error: 'HTTP 413' })
  })

  it('gives the Couldn\'t reach message when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const res = await getSquad(settings, fetchImpl)
    expect(res.success).toBe(false)
    expect(res.error).toBe("Couldn't reach Engine Room. Check the address and your internet.")
  })

  it('says Engine Room isn\'t set up when url or code is missing', async () => {
    const fetchImpl = vi.fn()
    const expected = "Engine Room isn't set up. Open ⚙ Settings → Engine Room."
    expect(await getSquad({ url: '', code: 'x' }, fetchImpl)).toEqual({ success: false, error: expected })
    expect(await getSquad(null, fetchImpl)).toEqual({ success: false, error: expected })
    expect(await sendMatch({ url: 'https://x', code: '' }, {}, fetchImpl)).toEqual({ success: false, error: expected })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('sendMatch', () => {
  it('POSTs JSON with Bearer auth and returns message and unknown', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ matchId: 'm', players: [], unknown: ['x'], message: 'Saved' }))
    const payload = { ref: 'r', opponent: 'Foo', players: [] }
    const res = await sendMatch(settings, payload, fetchImpl)
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://er.example.com/api/analyst/match')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toBe('Bearer abc123')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opts.body)).toEqual(payload)
    expect(res).toEqual({ success: true, message: 'Saved', unknown: ['x'] })
  })

  it('returns the server error on a 400', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ error: 'bad stat' }, 400))
    expect(await sendMatch(settings, {}, fetchImpl)).toEqual({ success: false, error: 'bad stat' })
  })

  it('gives the Couldn\'t reach message when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const res = await sendMatch(settings, {}, fetchImpl)
    expect(res.error).toMatch(/^Couldn't reach Engine Room/)
  })
})

describe('address checks', () => {
  const HTTPS_ONLY = 'Use the https:// address for Engine Room.'
  it('refuses http:// and sends nothing', async () => {
    const fetchImpl = vi.fn()
    expect(await getSquad({ url: 'http://er.example.com', code: 'x' }, fetchImpl)).toEqual({ success: false, error: HTTPS_ONLY })
    expect(await sendMatch({ url: 'http://er.example.com', code: 'x' }, {}, fetchImpl)).toEqual({ success: false, error: HTTPS_ONLY })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('refuses an address that is not a URL or uses another scheme', async () => {
    const fetchImpl = vi.fn()
    expect(await getSquad({ url: 'er.example.com', code: 'x' }, fetchImpl)).toEqual({ success: false, error: HTTPS_ONLY })
    expect(await getSquad({ url: 'ftp://er.example.com', code: 'x' }, fetchImpl)).toEqual({ success: false, error: HTTPS_ONLY })
    expect(await getSquad({ url: 'http://localhost.evil.com', code: 'x' }, fetchImpl)).toEqual({ success: false, error: HTTPS_ONLY })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('allows plain http for localhost and 127.0.0.1', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ players: [] }))
    expect((await getSquad({ url: 'http://localhost:3000', code: 'x' }, fetchImpl)).success).toBe(true)
    expect((await getSquad({ url: 'http://127.0.0.1:3000/', code: 'x' }, fetchImpl)).success).toBe(true)
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      'http://localhost:3000/api/analyst/squad',
      'http://127.0.0.1:3000/api/analyst/squad',
    ])
  })
  it('refuses to follow redirects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ players: [] }))
    await getSquad(settings, fetchImpl)
    await sendMatch(settings, {}, fetchImpl)
    expect(fetchImpl.mock.calls.map((c) => c[1].redirect)).toEqual(['error', 'error'])
  })
})

describe('a 2xx reply that is not from Engine Room', () => {
  const NOT_ER = "That address isn't Engine Room. Check it in ⚙ Settings → Engine Room."
  const htmlResponse = { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <') } }

  it('getSquad refuses a 200 HTML page', async () => {
    expect(await getSquad(settings, vi.fn().mockResolvedValue(htmlResponse))).toEqual({ success: false, error: NOT_ER })
  })
  it('getSquad refuses JSON without a players array', async () => {
    expect(await getSquad(settings, vi.fn().mockResolvedValue(okResponse({ ok: true })))).toEqual({ success: false, error: NOT_ER })
    expect(await getSquad(settings, vi.fn().mockResolvedValue(okResponse({ players: 'x' })))).toEqual({ success: false, error: NOT_ER })
  })
  it('getSquad accepts an empty players array', async () => {
    expect(await getSquad(settings, vi.fn().mockResolvedValue(okResponse({ players: [] })))).toEqual({ success: true, players: [] })
  })
  it('sendMatch refuses a 200 HTML page', async () => {
    expect(await sendMatch(settings, {}, vi.fn().mockResolvedValue(htmlResponse))).toEqual({ success: false, error: NOT_ER })
  })
  it('sendMatch refuses JSON without a string matchId', async () => {
    expect(await sendMatch(settings, {}, vi.fn().mockResolvedValue(okResponse({ message: 'ok' })))).toEqual({ success: false, error: NOT_ER })
    expect(await sendMatch(settings, {}, vi.fn().mockResolvedValue(okResponse({ matchId: 5, message: 'ok' })))).toEqual({ success: false, error: NOT_ER })
  })
})
