// Rules for profile usernames, which double as the /profile/[username] URL segment.

// What signup accepts — mirrors the `pattern` on the signup form's username input.
const NEW_USERNAME_PATTERN = /^[a-z0-9_-]+$/

// What may appear in the sitemap. Wider than the signup rule because older accounts
// (and Google OAuth signups, which derive a username from the email) have capitals and dots.
// Anything outside this set — spaces, '&', '@' — is left out: an '@' usually means the
// coach typed their email address, and that must not be published to search engines.
const URL_SAFE_USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/

export const USERNAME_MAX_LENGTH = 32

export function isValidNewUsername(username: string): boolean {
  return username.length <= USERNAME_MAX_LENGTH && NEW_USERNAME_PATTERN.test(username)
}

export function isSitemapSafeUsername(username: string): boolean {
  // A dots-only name like ".." is a path segment browsers normalise away.
  return URL_SAFE_USERNAME_PATTERN.test(username) && !/^\.+$/.test(username)
}

// Next.js hands dynamic route params over still percent-encoded, so "/profile/Smith%26co"
// arrives as "Smith%26co" and never matches the stored "Smith&co". Malformed escapes fall
// back to the raw value rather than throwing.
export function decodeUsernameParam(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
