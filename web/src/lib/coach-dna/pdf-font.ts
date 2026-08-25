import { Font } from '@react-pdf/renderer'

/** Fetches one font file's bytes from Google Fonts' CSS2 endpoint for a
 *  given family/weight/style query string (e.g. 'Geist:wght@700'). No
 *  User-Agent header is sent, which makes Google serve a plain TTF url
 *  (rather than WOFF2) -- the format @react-pdf/renderer's Font.register
 *  needs. Throws on any failure; callers decide how to degrade. */
async function loadPdfFont(query: string): Promise<Buffer> {
  const cssResponse = await fetch(`https://fonts.googleapis.com/css2?family=${query}&display=swap`)
  const css = await cssResponse.text()
  const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)
  if (!match) throw new Error(`No font URL found in Google Fonts CSS2 response for query: ${query}`)
  const fontResponse = await fetch(match[1])
  const arrayBuffer = await fontResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** @react-pdf/renderer's Font.register only accepts a string `src` (URL, file
 *  path, or data URL) -- it does not accept a raw Buffer at runtime despite
 *  some docs/examples suggesting otherwise. Encode the fetched bytes as a
 *  base64 data URL so the font store's data-URL loading path picks it up. */
function toFontDataUrl(bytes: Buffer): string {
  return `data:font/ttf;base64,${bytes.toString('base64')}`
}

let registered: Promise<void> | null = null

async function registerFontsOnce(): Promise<void> {
  try {
    const barlowCondensed = await loadPdfFont('Barlow+Condensed:ital,wght@1,800')
    Font.register({ family: 'Barlow Condensed', fonts: [{ src: toFontDataUrl(barlowCondensed) }] })
  } catch (err) {
    console.error('[coach-dna/pdf-font] Failed to load Barlow Condensed, falling back to default font:', err)
  }

  try {
    const geist400 = await loadPdfFont('Geist:wght@400')
    const geist700 = await loadPdfFont('Geist:wght@700')
    Font.register({
      family: 'Geist',
      fonts: [
        { src: toFontDataUrl(geist400) },
        { src: toFontDataUrl(geist700), fontWeight: 700 },
      ],
    })
  } catch (err) {
    console.error('[coach-dna/pdf-font] Failed to load Geist, falling back to default font:', err)
  }
}

/** Registers the brand fonts (Barlow Condensed, Geist) with @react-pdf/renderer's
 *  global font registry, once per process -- both outcome-PDF routes call this
 *  before renderToBuffer. Fetch failures are logged and swallowed per font
 *  family; a PDF still renders (in Helvetica) rather than 500ing over a font
 *  load hiccup. */
export async function registerPdfFonts(): Promise<void> {
  if (!registered) registered = registerFontsOnce()
  return registered
}
