// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const registerMock = vi.fn()
vi.mock('@react-pdf/renderer', () => ({
  Font: { register: (config: unknown) => registerMock(config) },
}))

const CSS2_RESPONSE = `
  @font-face {
    font-family: 'Geist';
    src: url(https://fonts.gstatic.com/s/geist/v1/geist-400.ttf) format('truetype');
  }
`
const FONT_BYTES = new Uint8Array([1, 2, 3, 4]).buffer

function mockFetchSequence(responses: (Response | Error)[]) {
  let call = 0
  global.fetch = vi.fn(async () => {
    const next = responses[call]
    call += 1
    if (next instanceof Error) throw next
    return next
  }) as unknown as typeof fetch
}

describe('registerPdfFonts', () => {
  beforeEach(() => {
    registerMock.mockClear()
    vi.resetModules()
  })

  it('registers Barlow Condensed and Geist with the fetched font bytes', async () => {
    mockFetchSequence([
      new Response(CSS2_RESPONSE), // Barlow Condensed CSS2
      new Response(FONT_BYTES),    // Barlow Condensed TTF
      new Response(CSS2_RESPONSE), // Geist 400 CSS2
      new Response(FONT_BYTES),    // Geist 400 TTF
      new Response(CSS2_RESPONSE), // Geist 700 CSS2
      new Response(FONT_BYTES),    // Geist 700 TTF
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await registerPdfFonts()

    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Barlow Condensed' }))
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Geist' }))
  })

  it('does not throw when a font fetch fails, and skips registering that font', async () => {
    mockFetchSequence([
      new Error('network down'), // Barlow Condensed CSS2 fetch fails
      new Response(CSS2_RESPONSE),
      new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE),
      new Response(FONT_BYTES),
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await expect(registerPdfFonts()).resolves.toBeUndefined()
    expect(registerMock).not.toHaveBeenCalledWith(expect.objectContaining({ family: 'Barlow Condensed' }))
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Geist' }))
  })

  it('only fetches once across repeated calls within the same process', async () => {
    mockFetchSequence([
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await registerPdfFonts()
    const callCountAfterFirst = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    await registerPdfFonts()
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCountAfterFirst)
  })
})
