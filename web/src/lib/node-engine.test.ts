// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Vercel refuses to build on a Node.js line it has retired (Node 20 was cut
 * off on 2026-10-01 with BUILD_UTILS_NODE_VERSION_DISCONTINUED), and the only
 * signal is a failed deployment: `next build`, typecheck and this suite all
 * pass locally on whatever Node the machine has. This test pins the floor so a
 * stale `engines` field, or a CI workflow drifting away from it, fails here.
 */
const webRoot = path.resolve(__dirname, '..', '..')
const repoRoot = path.resolve(webRoot, '..')

/** Oldest Node major Vercel still builds on. Raise it when Vercel retires the next line. */
const MIN_NODE_MAJOR = 22

function engineMajor(): number {
  const pkg = JSON.parse(readFileSync(path.join(webRoot, 'package.json'), 'utf8')) as { engines?: { node?: string } }
  const spec = pkg.engines?.node
  expect(spec, 'web/package.json must pin engines.node so Vercel builds on a known Node line').toBeTruthy()
  const match = /^(\d+)\.x$/.exec(spec!)
  expect(match, `engines.node should be "<major>.x", got ${spec}`).not.toBeNull()
  return Number(match![1])
}

describe('Node.js version pins', () => {
  it('web/package.json pins a Node line Vercel still builds on', () => {
    expect(engineMajor()).toBeGreaterThanOrEqual(MIN_NODE_MAJOR)
  })

  it('package-lock.json carries the same engines entry as package.json', () => {
    const lock = JSON.parse(readFileSync(path.join(webRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { engines?: { node?: string } }>
    }
    expect(lock.packages['']?.engines?.node).toBe(`${engineMajor()}.x`)
  })

  it('every GitHub workflow that sets up Node uses the same major as Vercel', () => {
    const dir = path.join(repoRoot, '.github', 'workflows')
    const major = engineMajor()
    const pins: string[] = []
    for (const file of readdirSync(dir).filter(f => /\.ya?ml$/.test(f))) {
      const text = readFileSync(path.join(dir, file), 'utf8')
      for (const m of text.matchAll(/node-version:\s*['"]?(\d+)/g)) pins.push(`${file}:${m[1]}`)
    }
    expect(pins.length, 'expected at least one setup-node step in .github/workflows').toBeGreaterThan(0)
    for (const pin of pins) {
      expect(pin.split(':')[1], `${pin} should pin Node ${major} to match web/package.json`).toBe(String(major))
    }
  })
})
