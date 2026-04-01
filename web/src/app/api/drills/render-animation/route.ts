import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import os from 'os'
import fs from 'fs'

// Cache the bundle path between requests so we only webpack-bundle once per server boot
let cachedBundlePath: string | null = null

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { canvasJson, drillTitle } = body

    if (!canvasJson) {
      return NextResponse.json({ error: 'canvasJson is required' }, { status: 400 })
    }

    // Dynamic imports — keep these outside the module scope so Next.js doesn't
    // try to statically analyse them (they're Node.js-only packages)
    const { bundle } = await import('@remotion/bundler')
    const { renderMedia, selectComposition } = await import('@remotion/renderer')

    // Bundle once and cache — this takes ~10s the first time, ~0ms after
    if (!cachedBundlePath) {
      const remotionEntry = path.resolve(process.cwd(), '..', 'remotion', 'src', 'index.ts')
      cachedBundlePath = await bundle({
        entryPoint: remotionEntry,
        onProgress: (p) => {
          if (p % 20 === 0) console.log(`[remotion bundle] ${p}%`)
        },
      })
      console.log('[remotion] bundle ready at', cachedBundlePath)
    }

    const inputProps = { canvasJson, drillTitle: drillTitle ?? '' }
    const duration = canvasJson.duration ?? 90

    const composition = await selectComposition({
      serveUrl: cachedBundlePath,
      id: 'DrillAnimation',
      inputProps,
    })

    // Override duration to match the actual animation length
    const comp = { ...composition, durationInFrames: duration }

    const outPath = path.join(os.tmpdir(), `drill-${Date.now()}.mp4`)

    await renderMedia({
      composition: comp,
      serveUrl: cachedBundlePath,
      codec: 'h264',
      outputLocation: outPath,
      inputProps,
      onProgress: ({ progress }) => {
        console.log(`[remotion render] ${Math.round(progress * 100)}%`)
      },
    })

    const buffer = fs.readFileSync(outPath)
    fs.unlinkSync(outPath)

    const slug = (drillTitle ?? 'drill').replace(/\s+/g, '-').toLowerCase()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${slug}-animation.mp4"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[render-animation]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Render failed' },
      { status: 500 }
    )
  }
}

// Increase body size limit — canvas JSON can be large
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}
