import { ANDROID_PACKAGE_NAME } from '@/lib/app-shell'

/**
 * Digital Asset Links for the Android app, served at /.well-known/assetlinks.json.
 * Chrome checks this file to prove the app and 18thman.app share an owner; without
 * a matching fingerprint the app still opens, but with a browser URL bar on top.
 *
 * Fingerprints come from ANDROID_TWA_SHA256_FINGERPRINTS (comma-separated) so they
 * can be added in Vercel without a code change. They're public by design — this
 * file is world-readable — but keeping them in env avoids a deploy per key. With
 * Play App Signing you need *Google's* app-signing key fingerprint (Play Console →
 * Setup → App signing), and optionally your upload key's for sideloaded test builds.
 */

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

export type AssetLink = {
  relation: string[]
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] }
}

/** Valid fingerprints, uppercased and de-duplicated, plus whatever didn't parse. */
export function parseFingerprints(raw: string | undefined): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  for (const part of (raw ?? '').split(',')) {
    const fp = part.trim().toUpperCase()
    if (!fp) continue
    if (!FINGERPRINT.test(fp)) invalid.push(part.trim())
    else if (!valid.includes(fp)) valid.push(fp)
  }
  return { valid, invalid }
}

/** The assetlinks.json body, or null when no valid fingerprint is configured. */
export function buildAssetLinks(fingerprints: string[], packageName: string = ANDROID_PACKAGE_NAME): AssetLink[] | null {
  if (fingerprints.length === 0) return null
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
    },
  ]
}
