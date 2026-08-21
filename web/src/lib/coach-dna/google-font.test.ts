import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadGoogleFont } from './google-font'

describe('loadGoogleFont', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('extracts the truetype font url from the CSS2 response and returns its bytes', async () => {
    const fontBytes = new ArrayBuffer(8)
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `@font-face { font-family: 'Barlow Condensed'; src: url(https://fonts.gstatic.com/font.ttf) format('truetype'); }`,
      })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fontBytes })

    const result = await loadGoogleFont('Barlow Condensed:ital,wght@1,800', 'Motivator')

    expect(result).toBe(fontBytes)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://fonts.gstatic.com/font.ttf',
      expect.objectContaining({ cache: 'force-cache' }),
    )
  })

  it('requests both the CSS and font file with a timeout signal and force-cache, so a hung Google Fonts response cannot hang the request', async () => {
    const fontBytes = new ArrayBuffer(8)
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `@font-face { font-family: 'Barlow Condensed'; src: url(https://fonts.gstatic.com/font.ttf) format('truetype'); }`,
      })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fontBytes })

    await loadGoogleFont('Barlow Condensed:ital,wght@1,800', 'Motivator')

    for (const call of fetchMock.mock.calls) {
      const opts = call[1] as { signal?: AbortSignal; cache?: string }
      expect(opts.signal).toBeInstanceOf(AbortSignal)
      expect(opts.cache).toBe('force-cache')
    }
  })

  it('throws when the CSS response is not ok', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({ ok: false })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not load font CSS')
  })

  it('throws when no truetype/opentype source is found in the CSS', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => 'nonsense' })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not find a truetype/opentype source')
  })

  it('throws when the font file download fails', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => `src: url(https://fonts.gstatic.com/font.ttf) format('truetype');` })
      .mockResolvedValueOnce({ ok: false })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not download font file')
  })
})
