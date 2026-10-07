import { describe, it, expect } from 'vitest'
import { decodeUsernameParam, isSitemapSafeUsername, isValidNewUsername } from './username'

describe('isValidNewUsername', () => {
  it.each(['coachsmith', 'coach_smith', 'coach-smith', 'coach99'])('accepts %s', (u) => {
    expect(isValidNewUsername(u)).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['trailing space', 'Coach '],
    ['capitals', 'Coach'],
    ['email address', 'coach@example.com'],
    ['ampersand', 'Smith&co'],
    ['dot', 'coach.smith'],
    ['too long', 'a'.repeat(33)],
  ])('rejects %s', (_label, u) => {
    expect(isValidNewUsername(u)).toBe(false)
  })
})

describe('isSitemapSafeUsername', () => {
  it.each(['alex', 'Alex', 'coach.smith', 'u-26_'])('includes %s', (u) => {
    expect(isSitemapSafeUsername(u)).toBe(true)
  })

  it.each(['Coach ', 'Smith&co', 'Sam@club.example', '', '.', '..'])('excludes %j', (u) => {
    expect(isSitemapSafeUsername(u)).toBe(false)
  })
})

describe('decodeUsernameParam', () => {
  it('decodes percent-encoded characters', () => {
    expect(decodeUsernameParam('Smith%26co')).toBe('Smith&co')
    expect(decodeUsernameParam('Coach%20')).toBe('Coach ')
    expect(decodeUsernameParam('coach%40example.com')).toBe('coach@example.com')
  })

  it('leaves a plain username unchanged', () => {
    expect(decodeUsernameParam('alex')).toBe('alex')
  })

  it('returns the raw value for a malformed escape instead of throwing', () => {
    expect(decodeUsernameParam('bad%E0%A4%A')).toBe('bad%E0%A4%A')
  })
})
