import { buildAssetLinks, parseFingerprints } from '@/lib/asset-links'

// Public, unauthenticated file Chrome fetches to verify the Android app.
// See lib/asset-links.ts and docs/android-release.md.
export function GET() {
  const { valid, invalid } = parseFingerprints(process.env.ANDROID_TWA_SHA256_FINGERPRINTS)
  if (invalid.length > 0) {
    console.error(`[assetlinks] ignoring ${invalid.length} malformed ANDROID_TWA_SHA256_FINGERPRINTS entr${invalid.length === 1 ? 'y' : 'ies'}`)
  }

  const body = buildAssetLinks(valid)
  if (!body) return new Response('Not found', { status: 404 })

  return Response.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
