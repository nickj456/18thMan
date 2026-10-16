// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import nextConfig from '../../next.config'

/**
 * The Play Designer is a self-contained static page in public/play-designer/.
 * Nothing in the Next build looks inside it, so a missing font or logo, or a
 * dropped rewrite, only shows up as a 404 in the browser. These checks catch
 * that here instead.
 */
const publicDir = path.resolve(__dirname, '..', '..', 'public')
const html = readFileSync(path.join(publicDir, 'play-designer', 'index.html'), 'utf8')

describe('Play Designer static page', () => {
  it('serves /play-designer from its index.html via a rewrite', async () => {
    const rewrites = await nextConfig.rewrites!()
    const list = Array.isArray(rewrites)
      ? rewrites
      : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])]
    expect(list).toContainEqual({ source: '/play-designer', destination: '/play-designer/index.html' })
  })

  it('only references /play-designer/ assets that exist on disk', () => {
    const refs = [...new Set(html.match(/\/play-designer\/[\w./-]+/g) ?? [])]
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      expect(existsSync(path.join(publicDir, ref)), `${ref} is referenced but missing from public/`).toBe(true)
    }
  })

  it('loads no external scripts, styles or fonts', () => {
    const external = html.match(/(?:src|href)=["']https?:\/\/[^"']+|url\(["']?https?:\/\/[^)]+\)/g) ?? []
    expect(external).toEqual([])
  })
})
