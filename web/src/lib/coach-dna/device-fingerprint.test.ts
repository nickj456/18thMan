import { describe, it, expect } from 'vitest'
import { hashDeviceFingerprint } from './device-fingerprint'

describe('hashDeviceFingerprint', () => {
  it('is deterministic for the same device id and token', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-1', 'token-1')
    expect(a).toBe(b)
  })

  it('produces a 64-character hex sha256 digest', () => {
    expect(hashDeviceFingerprint('device-1', 'token-1')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different hashes for the same device across different requests', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-1', 'token-2')
    expect(a).not.toBe(b)
  })

  it('produces different hashes for different devices on the same request', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-2', 'token-1')
    expect(a).not.toBe(b)
  })
})
