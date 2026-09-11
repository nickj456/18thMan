/**
 * Pure scanning helpers behind `groq-models.test.ts`.
 *
 * These live in their own module for one reason: a guard that is only ever
 * observed passing is not a guard. Keeping the scan logic pure means the test
 * can feed it a synthetic corpus containing a known violation and assert that
 * it *reports* — so a regex typo, a bad root directory, or a swallowed read
 * can't quietly turn the whole thing green.
 */

export interface ScannedFile {
  /** Path relative to `src/`, POSIX-separated. */
  rel: string
  text: string
}

/**
 * Model ids are only ever legitimate inside `groq-models.ts`. Anywhere else,
 * a string literal reaching a provider call is a hardcoded id waiting to rot.
 *
 * The first regex catches the default `groq(...)` spelling plus member calls
 * (`groq.languageModel('…')`), template literals, and a second argument. The
 * second handles a renamed provider (`const g = createGroq(); g('…')`), which
 * a name-agnostic pattern would otherwise miss.
 */
const DIRECT_CALL = /\bgroq\w*\s*(?:\.\w+)?\s*\(\s*[`'"]/g
const PROVIDER_BINDING = /\b(?:const|let|var)\s+(\w+)\s*=\s*createGroq\s*\(/g

function providerNames(text: string): string[] {
  const names = new Set<string>()
  for (const m of text.matchAll(PROVIDER_BINDING)) names.add(m[1])
  return [...names]
}

/** Every hardcoded model-id literal passed to a Groq provider call. */
export function scanForInlineModelIds(files: ScannedFile[]): string[] {
  const offenders: string[] = []
  for (const { rel, text } of files) {
    const hits = new Set<string>(text.match(DIRECT_CALL) ?? [])
    for (const name of providerNames(text)) {
      // A renamed binding: `g('llama-…')`. Escape it — a provider could
      // legitimately be named something regex-significant.
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const renamed = new RegExp(`\\b${escaped}\\s*(?:\\.\\w+)?\\s*\\(\\s*[\`'"]`, 'g')
      for (const hit of text.match(renamed) ?? []) hits.add(hit)
    }
    for (const hit of hits) offenders.push(`${rel}: ${hit.trim()}`)
  }
  return offenders
}

/** Any mention of a retired model id, wherever it appears. */
export function scanForDeadIds(files: ScannedFile[], deadIds: readonly string[]): string[] {
  const offenders: string[] = []
  for (const { rel, text } of files) {
    for (const dead of deadIds) {
      if (text.includes(dead)) offenders.push(`${rel} uses decommissioned model "${dead}"`)
    }
  }
  return offenders
}

/**
 * Exported string constants in `groq-models.ts` that look like model ids.
 *
 * This is what closes the self-exclusion hole: the scans above skip
 * `groq-models.ts` (it necessarily contains the ids), so without this a new
 * `export const GROQ_VISION = '<retired id>'` plus `groq(GROQ_VISION)` at a
 * call site would sail past every check and 404 in production.
 *
 * Array members are ignored — `DECOMMISSIONED_GROQ_MODELS` is a denylist and
 * is supposed to contain dead ids.
 */
export function extractExportedModelIds(text: string): { name: string; id: string }[] {
  const found: { name: string; id: string }[] = []
  for (const m of text.matchAll(/export\s+const\s+(\w+)\s*(?::[^=]+)?=\s*['"]([^'"]+)['"]/g)) {
    found.push({ name: m[1], id: m[2] })
  }
  return found
}
