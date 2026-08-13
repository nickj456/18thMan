import { createHash } from 'crypto'

/**
 * Hashes a client-generated device id together with the feedback request's
 * token, so the hash is meaningless outside the (device, request) pair it
 * was computed for. Not a security control — see the design spec's
 * explicit scope note: no CAPTCHA, no IP-based blocking, basic throttling
 * only.
 */
export function hashDeviceFingerprint(deviceId: string, token: string): string {
  return createHash('sha256').update(`${deviceId}:${token}`).digest('hex')
}
