import { lookup } from 'node:dns/promises'
import net from 'node:net'

// SSRF guard for server-side fetches of user-supplied URLs.
//
// The threat: a user gives us a URL to fetch (e.g. link previews). A naive
// hostname regex is bypassable by (a) a public domain that redirects to an
// internal address, and (b) a hostname that *resolves* to a private IP. This
// module resolves DNS and validates every redirect hop against private ranges.
//
// Residual risk: DNS rebinding (TOCTOU between lookup and the OS connect) is not
// fully closed here — that needs pinning the resolved IP into the connection.
// This is a large improvement over a hostname regex and covers the realistic
// redirect + resolve bypasses.

/** True if an IP literal is in a private, loopback, link-local, or reserved range. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip)
  if (net.isIPv6(ip)) return isPrivateIpv6(ip)
  return true // unparseable — treat as unsafe
}

function isPrivateIpv4(ip: string): boolean {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  if (a === 0) return true                              // 0.0.0.0/8
  if (a === 10) return true                             // 10.0.0.0/8 private
  if (a === 127) return true                            // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true               // 169.254.0.0/16 link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true      // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true               // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true     // 100.64.0.0/10 CGNAT
  if (a >= 224) return true                             // 224.0.0.0/4 multicast + 240/4 reserved
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase()
  if (addr === '::1' || addr === '::') return true      // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  if (addr.startsWith('fe8') || addr.startsWith('fe9') ||
      addr.startsWith('fea') || addr.startsWith('feb')) return true // fe80::/10 link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true   // fc00::/7 unique-local
  return false
}

/** Throws if the URL is not http(s) or its host resolves to a private address. */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported protocol')
  }

  const host = parsed.hostname
  // Literal IP host — check directly (strip IPv6 brackets)
  const literal = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  if (net.isIP(literal)) {
    if (isPrivateIp(literal)) throw new Error('Blocked address')
    return parsed
  }

  // Resolve DNS and reject if ANY returned address is private
  const results = await lookup(host, { all: true })
  if (results.length === 0) throw new Error('Unresolvable host')
  for (const { address } of results) {
    if (isPrivateIp(address)) throw new Error('Blocked address')
  }
  return parsed
}

/**
 * fetch() that validates the target (and every redirect hop) against private
 * ranges. Follows up to `maxRedirects` redirects manually.
 */
export async function safeFetch(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {},
  maxRedirects = 5,
): Promise<Response> {
  let current = url
  for (let i = 0; i <= maxRedirects; i++) {
    await assertPublicUrl(current)
    const res = await fetch(current, { ...init, redirect: 'manual' })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return res
      current = new URL(location, current).href
      continue
    }
    return res
  }
  throw new Error('Too many redirects')
}
