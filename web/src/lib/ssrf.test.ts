// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isPrivateIp, assertPublicUrl } from './ssrf'

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
})
