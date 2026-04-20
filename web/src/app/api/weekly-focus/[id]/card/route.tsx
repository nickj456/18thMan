import { ImageResponse } from 'next/og'

export const runtime = 'edge'

async function loadFont(): Promise<ArrayBuffer> {
  // Google Fonts returns TTF when the User-Agent doesn't support woff2
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap&subset=latin',
    { headers: { 'User-Agent': 'Mozilla/4.0' } },
  ).then(r => r.text())

  const url = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1]
  if (!url) throw new Error(`Could not parse font URL from CSS: ${css.slice(0, 200)}`)
  return fetch(url).then(r => r.arrayBuffer())
}

export async function GET() {
  const fontData = await loadFont()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ff0000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ color: 'white', fontSize: 80, fontFamily: 'Inter', fontWeight: 900 }}>
        18TH MAN
      </p>
    </div>,
    {
      width: 800,
      height: 400,
      fonts: [{ name: 'Inter', data: fontData, weight: 900, style: 'normal' }],
    },
  )
}
