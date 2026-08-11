// Guards every place a redirect destination is read from user-controlled
// input (a query param or form field) before it reaches redirect() or
// NextResponse.redirect(). Never pass an unvalidated `next` value to either.

/** True if `path` is safe to redirect to: a same-site relative path, never
 *  an absolute URL or a protocol-relative one (`//evil.com` is parsed by
 *  browsers as `https://evil.com`). Also rejects a leading backslash, since
 *  some browsers normalize `/\evil.com` to `//evil.com`. */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/')) return false
  // Reject outright rather than strip-and-check: a tab/newline/CR left in
  // the original string would still reach redirect() downstream and can
  // trigger a framework-level 500, which an unsafe `next` must never do.
  if (/[\t\n\r]/.test(path)) return false
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith('//')) return false
  return true
}
