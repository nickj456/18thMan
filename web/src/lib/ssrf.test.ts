// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// DNS is mocked so hostname-based tests never hit the network. Literal-IP
// tests bypass lookup entirely (ssrf.ts checks net.isIP first).
const dnsTable: Record<string, { address: string; family: number }[]> = {}

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (host: string) => {
    if (host in dnsTable) return dnsTable[host]
    return [{ address: '93.184.216.34', family: 4 }] // public default
  }),
}))

import { isPrivateIp, assertPublicUrl, safeFetch } from './ssrf'

describe('isPrivateIp', () => {
  it('blocks loopback, RFC1918, link-local, CGNAT, and multicast IPv4 ranges', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true)
    expect(isPrivateIp('10.1.2.3')).toBe(true)
    expect(isPrivateIp('172.16.0.1')).toBe(true)
    expect(isPrivateIp('172.31.255.255')).toBe(true)
    expect(isPrivateIp('192.168.1.1')).toBe(true)
    expect(isPrivateIp('169.254.169.254')).toBe(true) // cloud metadata endpoint
    expect(isPrivateIp('100.64.0.1')).toBe(true) // CGNAT
    expect(isPrivateIp('224.0.0.1')).toBe(true) // multicast
    expect(isPrivateIp('0.0.0.0')).toBe(true)
  })

  it('allows public IPv4 addresses, including edges of private ranges', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false)
    expect(isPrivateIp('172.15.255.255')).toBe(false) // just below 172.16/12
    expect(isPrivateIp('172.32.0.0')).toBe(false) // just above 172.16/12
    expect(isPrivateIp('100.63.255.255')).toBe(false) // just below CGNAT
    expect(isPrivateIp('1.1.1.1')).toBe(false)
  })

  it('blocks IPv6 loopback, link-local, unique-local, and mapped-private addresses', () => {
    expect(isPrivateIp('::1')).toBe(true)
    expect(isPrivateIp('fe80::1')).toBe(true)
    expect(isPrivateIp('fd00::1')).toBe(true)
    expect(isPrivateIp('::ffff:192.168.0.1')).toBe(true) // v4-mapped private
    expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false) // v4-mapped public
    expect(isPrivateIp('2606:4700::1111')).toBe(false) // public (Cloudflare)
  })

  it('treats unparseable input as unsafe', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true)
    expect(isPrivateIp('')).toBe(true)
  })
})

describe('assertPublicUrl', () => {
  it('rejects non-http(s) protocols', async () => {
    await expect(assertPublicUrl('ftp://example.com/file')).rejects.toThrow('Unsupported protocol')
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow('Unsupported protocol')
  })

  it('rejects malformed URLs', async () => {
    await expect(assertPublicUrl('not a url')).rejects.toThrow('Invalid URL')
  })

  it('rejects literal private IPs without a DNS lookup', async () => {
    await expect(assertPublicUrl('http://127.0.0.1/admin')).rejects.toThrow('Blocked address')
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow('Blocked address')
    await expect(assertPublicUrl('http://[::1]:8080/')).rejects.toThrow('Blocked address')
  })

  it('accepts literal public IPs', async () => {
    const url = await assertPublicUrl('https://8.8.8.8/resolve')
    expect(url.hostname).toBe('8.8.8.8')
  })

  it('rejects a hostname that resolves to a private IP', async () => {
    dnsTable['rebind.example'] = [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 }, // one private record poisons the set
    ]
    await expect(assertPublicUrl('https://rebind.example/')).rejects.toThrow('Blocked address')
  })

  it('rejects a hostname with no DNS records', async () => {
    dnsTable['ghost.example'] = []
    await expect(assertPublicUrl('https://ghost.example/')).rejects.toThrow('Unresolvable host')
  })
})

describe('safeFetch', () => {
  function redirect(status: number, location?: string) {
    return {
      status,
      headers: new Headers(location ? { location } : {}),
    } as Response
  }
  const okResponse = { status: 200, headers: new Headers() } as Response

  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('blocks a redirect hop that points at a private address', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(redirect(302, 'http://169.254.169.254/latest/meta-data/')))
    await expect(safeFetch('https://public.example/start')).rejects.toThrow('Blocked address')
  })

  it('resolves a relative Location against the current URL and re-validates it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect(301, '/next'))
      .mockResolvedValueOnce(okResponse)
    vi.stubGlobal('fetch', fetchMock)

    const res = await safeFetch('https://public.example/start')
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenLastCalledWith('https://public.example/next', expect.anything())
  })

  it('returns the response for a 3xx with no Location header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(redirect(302)))
    const res = await safeFetch('https://public.example/start')
    expect(res.status).toBe(302)
  })

  it('throws after exceeding the redirect limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect(301, 'https://public.example/loop')))
    await expect(safeFetch('https://public.example/loop')).rejects.toThrow('Too many redirects')
  })
})
