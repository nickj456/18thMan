import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAssetLinks, parseFingerprints } from './asset-links'
import { ANDROID_PACKAGE_NAME } from './app-shell'
import { GET } from '@/app/.well-known/assetlinks.json/route'

const FP_A = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':')
const FP_B = Array.from({ length: 32 }, () => 'AB').join(':')

describe('parseFingerprints', () => {
  it('returns nothing for an unset or blank env var', () => {
    expect(parseFingerprints(undefined)).toEqual({ valid: [], invalid: [] })
    expect(parseFingerprints(' , ')).toEqual({ valid: [], invalid: [] })
  })

  it('accepts several, trims, uppercases and de-duplicates', () => {
    expect(parseFingerprints(` ${FP_A.toLowerCase()} ,${FP_B},${FP_A}`)).toEqual({ valid: [FP_A, FP_B], invalid: [] })
  })

  it('separates malformed entries (SHA-1 length, no colons, junk)', () => {
    const sha1 = FP_A.split(':').slice(0, 20).join(':')
    const { valid, invalid } = parseFingerprints(`${FP_A},${sha1},${FP_B.replace(/:/g, '')},nope`)
    expect(valid).toEqual([FP_A])
    expect(invalid).toHaveLength(3)
  })
})

describe('buildAssetLinks', () => {
  it('is null with no fingerprints', () => {
    expect(buildAssetLinks([])).toBeNull()
  })

  it('delegates handle_all_urls to the Android package', () => {
    expect(buildAssetLinks([FP_A])).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: ANDROID_PACKAGE_NAME, sha256_cert_fingerprints: [FP_A] },
      },
    ])
  })
})

describe('GET /.well-known/assetlinks.json', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('404s when no fingerprint is configured', () => {
    vi.stubEnv('ANDROID_TWA_SHA256_FINGERPRINTS', '')
    expect(GET().status).toBe(404)
  })

  it('serves JSON for configured fingerprints', async () => {
    vi.stubEnv('ANDROID_TWA_SHA256_FINGERPRINTS', FP_A)
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body[0].target.sha256_cert_fingerprints).toEqual([FP_A])
  })

  it('logs and skips malformed entries without echoing them', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('ANDROID_TWA_SHA256_FINGERPRINTS', `${FP_A},not-a-fingerprint`)
    const body = await GET().json()
    expect(body[0].target.sha256_cert_fingerprints).toEqual([FP_A])
    expect(err).toHaveBeenCalledTimes(1)
    expect(String(err.mock.calls[0][0])).not.toContain('not-a-fingerprint')
  })
})
