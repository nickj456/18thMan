import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  ALLOWED_GROQ_MODELS,
  DECOMMISSIONED_GROQ_MODELS,
  GROQ_TEXT_HEAVY,
  GROQ_TEXT_FAST,
  GROQ_SAFEGUARD,
} from './groq-models'
import {
  scanForInlineModelIds,
  scanForDeadIds,
  extractExportedModelIds,
  type ScannedFile,
} from './groq-model-scan'

const SRC_ROOT = join(__dirname, '..', '..')
const MODELS_FILE = 'lib/ai/groq-models.ts'
const SCAN_FILE = 'lib/ai/groq-model-scan.ts'
const SELF_TEST = 'lib/ai/groq-models.test.ts'

/** The three files that necessarily contain model ids or the patterns matching them. */
const EXEMPT = new Set([MODELS_FILE, SCAN_FILE, SELF_TEST])

function sourceFiles(dir: string, out: string[] = []): string[] {
  // withFileTypes avoids statSync, which follows symlinks — a circular link
  // under src/ would otherwise blow the stack and a broken one would throw.
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, out)
    else if (/\.(m|c)?[jt]sx?$/.test(entry.name)) out.push(full)
  }
  return out
}

const FILES: ScannedFile[] = sourceFiles(SRC_ROOT).map(full => ({
  rel: relative(SRC_ROOT, full).split('\\').join('/'),
  text: readFileSync(full, 'utf8'),
}))

const SCANNABLE = FILES.filter(f => !EXEMPT.has(f.rel))

function fileNamed(rel: string): ScannedFile {
  const found = FILES.find(f => f.rel === rel)
  if (!found) throw new Error(`expected ${rel} to exist`)
  return found
}

describe('groq-models — the allowlist itself', () => {
  it('still names the models this account can actually serve', () => {
    expect(ALLOWED_GROQ_MODELS).toEqual([GROQ_TEXT_HEAVY, GROQ_TEXT_FAST, GROQ_SAFEGUARD])
  })

  it('never lists a decommissioned id as allowed', () => {
    for (const dead of DECOMMISSIONED_GROQ_MODELS) {
      expect(ALLOWED_GROQ_MODELS as readonly string[]).not.toContain(dead)
    }
  })

  it('keeps a non-empty denylist, so the dead-id scan can never pass vacuously', () => {
    // Emptying this array would turn two scans below into no-ops that still
    // report green. Pin the casualties that motivated the module.
    expect(DECOMMISSIONED_GROQ_MODELS.length).toBeGreaterThanOrEqual(9)
    expect(DECOMMISSIONED_GROQ_MODELS).toContain('llama-3.3-70b-versatile')
    expect(DECOMMISSIONED_GROQ_MODELS).toContain('llama-3.1-8b-instant')
    expect(DECOMMISSIONED_GROQ_MODELS).toContain('meta-llama/llama-4-scout-17b-16e-instruct')
  })

  it('exports no model-id constant outside the allowlist', () => {
    // Closes the self-exclusion hole: the source scans skip groq-models.ts, so
    // a new `export const GROQ_VISION = '<retired id>'` used via groq(GROQ_VISION)
    // would otherwise be invisible to every other check in this file.
    const exported = extractExportedModelIds(fileNamed(MODELS_FILE).text)
    const ids = exported.map(e => e.id)
    expect(ids.length).toBeGreaterThan(0)
    for (const { name, id } of exported) {
      expect(ALLOWED_GROQ_MODELS as readonly string[], `${name} = "${id}" is not in ALLOWED_GROQ_MODELS`).toContain(id)
    }
  })
})

describe('groq-models — scanning the source tree', () => {
  it('finds the real source files', () => {
    // Guards against a broken SRC_ROOT silently reducing every scan to nothing.
    expect(SCANNABLE.length).toBeGreaterThan(100)
    expect(SCANNABLE.map(f => f.rel)).toContain('app/api/chat/route.ts')
  })

  it('has no decommissioned Groq model id anywhere in src/', () => {
    expect(scanForDeadIds(SCANNABLE, DECOMMISSIONED_GROQ_MODELS)).toEqual([])
  })

  it('never hardcodes a model id at a groq() call site', () => {
    expect(scanForInlineModelIds(SCANNABLE)).toEqual([])
  })
})

describe('groq-models — the scanner actually reports violations', () => {
  // Without these, the guard is only ever observed in its passing state.
  const corpus = (text: string): ScannedFile[] => [{ rel: 'x.ts', text }]

  it('reports a decommissioned id wherever it appears', () => {
    const offenders = scanForDeadIds(
      corpus(`const m = "llama-3.3-70b-versatile"`),
      DECOMMISSIONED_GROQ_MODELS,
    )
    expect(offenders).toHaveLength(1)
    expect(offenders[0]).toContain('x.ts')
    expect(offenders[0]).toContain('llama-3.3-70b-versatile')
  })

  it.each([
    ['plain single quotes', `groq('some-model')`],
    ['double quotes', `groq("some-model")`],
    ['template literal', 'groq(`some-model`)'],
    ['a second argument', `groq('some-model', { structuredOutputs: true })`],
    ['a trailing comma across lines', `groq(\n  'some-model',\n)`],
    ['a member call', `groq.languageModel('some-model')`],
    ['a renamed provider binding', `const g = createGroq()\nconst m = g('some-model')`],
    ['a renamed member call', `const client = createGroq()\nclient.languageModel('some-model')`],
  ])('catches a hardcoded id written with %s', (_label, source) => {
    expect(scanForInlineModelIds(corpus(source))).not.toEqual([])
  })

  it('does not flag a call site that uses a constant', () => {
    expect(scanForInlineModelIds(corpus(`groq(GROQ_TEXT_HEAVY)`))).toEqual([])
    expect(scanForInlineModelIds(corpus(`const g = createGroq()\ng(GROQ_TEXT_FAST)`))).toEqual([])
  })

  it('does not flag unrelated function calls that take strings', () => {
    expect(scanForInlineModelIds(corpus(`console.log('hello')\nz.string('x')`))).toEqual([])
  })
})

describe('groq-models — each call site stays on its intended tier', () => {
  it.each([
    ['lib/coach-dna/safeguarding.ts', 'GROQ_SAFEGUARD'],
    ['app/(app)/podcasts/actions.ts', 'GROQ_TEXT_FAST'],
    ['app/(app)/groups/[id]/ai-guidance/actions.ts', 'GROQ_TEXT_FAST'],
    ['app/(discover)/drills/youtube-actions.ts', 'GROQ_TEXT_HEAVY'],
    ['app/(app)/game-plans/actions.ts', 'GROQ_TEXT_HEAVY'],
    ['app/api/chat/route.ts', 'GROQ_TEXT_HEAVY'],
  ])('%s uses %s', (rel, constant) => {
    expect(fileNamed(rel).text).toContain(`groq(${constant})`)
  })
})
