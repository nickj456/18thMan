/** Fetches a Google Font's TTF/OTF bytes at request time for use with
 *  next/og's ImageResponse, which needs real font bytes -- a next/font/google
 *  import only produces a CSS @font-face rule for the browser, not usable
 *  bytes here. Google's CSS2 endpoint returns a `truetype`/`opentype`
 *  @font-face src for a plain server-side fetch (no browser User-Agent to
 *  negotiate woff2 against) -- the same technique Vercel's own OG-image
 *  examples use, so no font file needs to be vendored into the repo. */
export async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`
  const cssRes = await fetch(cssUrl)
  if (!cssRes.ok) throw new Error(`Could not load font CSS for ${family}`)
  const css = await cssRes.text()

  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)
  if (!match) throw new Error(`Could not find a truetype/opentype source for ${family}`)

  const fontRes = await fetch(match[1])
  if (!fontRes.ok) throw new Error(`Could not download font file for ${family}`)
  return fontRes.arrayBuffer()
}
