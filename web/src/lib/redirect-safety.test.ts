import { describe, it, expect } from 'vitest'
import { isSafeRedirectPath } from './redirect-safety'

describe('isSafeRedirectPath', () => {
  it('accepts a plain relative path', () => {
    expect(isSafeRedirectPath('/admin/coach-dna')).toBe(true)
  })

  it('accepts a relative path with a query string', () => {
    expect(isSafeRedirectPath('/admin/coach-dna/assessment/abc-123?q=5')).toBe(true)
  })

  it('rejects a protocol-relative path (open-redirect vector)', () => {
    expect(isSafeRedirectPath('//evil.com')).toBe(false)
  })

  it('rejects an absolute URL', () => {
    expect(isSafeRedirectPath('https://evil.com')).toBe(false)
  })

  it('rejects a backslash-based bypass attempt', () => {
    expect(isSafeRedirectPath('/\\evil.com')).toBe(false)
  })

  it('rejects a tab-based bypass attempt', () => {
    // Rejected outright (not stripped-then-checked) so the raw tab never
    // reaches a downstream redirect() call and can't trigger a 500.
    expect(isSafeRedirectPath('/\t/evil.com')).toBe(false)
  })

  it('rejects a newline-based bypass attempt', () => {
    // Rejected outright (not stripped-then-checked) so the raw newline
    // never reaches a downstream redirect() call and can't trigger a 500.
    expect(isSafeRedirectPath('/\n/evil.com')).toBe(false)
  })

  it('rejects a path with no leading slash', () => {
    expect(isSafeRedirectPath('admin/coach-dna')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isSafeRedirectPath('')).toBe(false)
  })

  it('rejects null and undefined', () => {
    expect(isSafeRedirectPath(null)).toBe(false)
    expect(isSafeRedirectPath(undefined)).toBe(false)
  })
})
