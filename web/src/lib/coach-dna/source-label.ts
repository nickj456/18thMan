import type { ScoreSource } from './config'

const RESPONDENT_NOUN: Record<Exclude<ScoreSource, 'self'>, string> = {
  player_voice: 'player',
  parent_voice: 'parent',
  peer_observation: 'peer',
}

function joinEnglish(words: string[]): string {
  if (words.length === 1) return words[0]
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** A short "Includes X feedback" tag for one category, or null if that
 *  category is still self-only (including when sourcedCategories is entirely
 *  absent -- rows persisted before this field existed). */
export function sourceTagFor(sourcedCategories: Record<string, string[]> | undefined, categorySlug: string): string | null {
  const sources = sourcedCategories?.[categorySlug] ?? ['self']
  const external = sources.filter((s): s is Exclude<ScoreSource, 'self'> => s !== 'self')
  if (external.length === 0) return null
  const nouns = [...new Set(external.map(s => RESPONDENT_NOUN[s]))]
  return `Includes ${joinEnglish(nouns)} feedback`
}

/** True if every category in categorySlugs is self-only (or sourcedCategories
 *  is entirely absent) -- the signal for whether to keep showing today's
 *  blanket "self-assessment only" line instead of per-category tags. */
export function allCategoriesSelfOnly(sourcedCategories: Record<string, string[]> | undefined, categorySlugs: string[]): boolean {
  return categorySlugs.every(slug => sourceTagFor(sourcedCategories, slug) === null)
}
