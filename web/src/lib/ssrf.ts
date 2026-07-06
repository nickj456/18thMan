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

/**
 * Expand an IPv6 literal to its eight 16-bit groups. Handles `::` compression
 * and a trailing dotted IPv4 (converted to two groups). Returns null if the
 * address cannot be parsed. This matters because URL/DNS normalise
 * IPv4-mapped addresses to HEX form (`::ffff:127.0.0.1` → `::ffff:7f00:1`),
 * which a dotted-form regex silently misses.
 */
function expandIpv6(input: string): number[] | null {
  let addr = input
  const zoneIdx = addr.indexOf('%')
  if (zoneIdx !== -1) addr = addr.slice(0, zoneIdx)

  // Convert a trailing dotted IPv4 into two 16-bit hex groups
  if (addr.includes('.')) {
    const lastColon = addr.lastIndexOf(':')
    const parts = addr.slice(lastColon + 1).split('.').map(Number)
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null
    addr =
      addr.slice(0, lastColon + 1) +
      (((parts[0] << 8) | parts[1]).toString(16)) + ':' +
      (((parts[2] << 8) | parts[3]).toString(16))
  }

  const halves = addr.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const groupsStr =
    halves.length === 2
      ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail]
      : head
  if (groupsStr.length !== 8) return null

  const groups: number[] = []
  for (const g of groupsStr) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null
    groups.push(parseInt(g, 16))
  }
  return groups
}

function embeddedIpv4(g6: number, g7: number): string {
  return `${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`
}

function isPrivateIpv6(ip: string): boolean {
  const groups = expandIpv6(ip.toLowerCase())
  if (!groups) return true // unparseable — treat as unsafe
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups

  const leading5Zero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0

  // ::  (unspecified) and ::1 (loopback)
  if (leading5Zero && g5 === 0 && g6 === 0 && (g7 === 0 || g7 === 1)) return true
  // IPv4-mapped ::ffff:0:0/96 and IPv4-compatible ::/96 — validate embedded v4
  // (covers both hex and dotted spellings after expansion)
  if (leading5Zero && (g5 === 0xffff || g5 === 0)) return isPrivateIpv4(embeddedIpv4(g6, g7))
  // NAT64 64:ff9b::/96 — translator prefix embedding an IPv4
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPrivateIpv4(embeddedIpv4(g6, g7))
  }
  if ((g0 & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g0 & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
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
