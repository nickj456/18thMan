import { describe, expect, it } from 'vitest'
import manifest from './manifest'

// PWABuilder / Bubblewrap build the Android app from this manifest and reject or
// warn on a manifest missing these.
describe('web app manifest', () => {
  const m = manifest()

  it('has a stable id and root scope', () => {
    expect(m.id).toBe('/')
    expect(m.scope).toBe('/')
    expect(m.display).toBe('standalone')
  })

  it('has a 512px "any" icon and a separate 512px maskable icon', () => {
    const icons = m.icons ?? []
    expect(icons.some(i => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true)
    expect(icons.some(i => i.sizes === '192x192')).toBe(true)
  })
})
