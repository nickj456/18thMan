// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const safeFetchMock = vi.fn()
vi.mock('@/lib/ssrf', () => ({
  safeFetch: (...args: unknown[]) => safeFetchMock(...args),
}))

import { extractUrl, fetchLinkPreview } from './link-preview'

function htmlResponse(html: string, contentType = 'text/html; charset=utf-8') {
  return {
    ok: true,
    headers: new Headers({ 'content-type': contentType }),
    text: async () => html,
  }
}

describe('extractUrl', () => {
  it('pulls the first URL out of message text', () => {
    expect(extractUrl('check https://example.com/a and https://example.com/b')).toBe('https://example.com/a')
    expect(extractUrl('no links here')).toBeNull()
  })
})

describe('fetchLinkPreview', () => {
  beforeEach(() => {
    safeFetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('returns null when the SSRF guard blocks the URL', async () => {
    safeFetchMock.mockRejectedValue(new Error('Blocked address'))
    expect(await fetchLinkPreview('http://169.254.169.254/')).toBeNull()
  })

  it('returns null on a non-OK response', async () => {
    safeFetchMock.mockResolvedValue({ ok: false, headers: new Headers() })
    expect(await fetchLinkPreview('https://example.com/404')).toBeNull()
  })

  it('returns null for non-HTML content types', async () => {
    safeFetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      text: async () => '',
    })
    expect(await fetchLinkPreview('https://example.com/file.pdf')).toBeNull()
  })

  it('parses Open Graph metadata and resolves relative images', async () => {
    safeFetchMock.mockResolvedValue(htmlResponse(`
      <html><head>
        <meta property="og:title" content="Line Speed Drills" />
        <meta property="og:description" content="Defensive line speed session" />
        <meta property="og:image" content="/img/cover.png" />
      </head></html>
    `))
    const preview = await fetchLinkPreview('https://www.example.com/drills')
    expect(preview).toEqual({
      url: 'https://www.example.com/drills',
      title: 'Line Speed Drills',
      description: 'Defensive line speed session',
      image: 'https://www.example.com/img/cover.png',
      domain: 'example.com',
    })
  })

  it('short-circuits YouTube URLs without calling the SSRF-guarded fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Match Highlights' }),
    }))
    const preview = await fetchLinkPreview('https://youtu.be/dQw4w9WgXcQ')
    expect(safeFetchMock).not.toHaveBeenCalled()
    expect(preview).toMatchObject({
      title: 'Match Highlights',
      image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      domain: 'youtube.com',
    })
  })
})
