import type { ScoreSource } from './config'

/** True once any category has blended in feedback beyond the coach's own
 *  self-view. A missing sourcedCategories (summaries persisted before this
 *  field existed) is treated as self-only, matching SelfAssessmentSummary's
 *  own documented fallback. */
export function hasBlendedFeedback(sourcedCategories: Record<string, string[]> | undefined): boolean {
  if (!sourcedCategories) return false
  return Object.values(sourcedCategories).some(sources => sources.some(s => s !== 'self'))
}

/** Structural equality (unordered per-category source lists) between a
 *  cached summary's sourcedCategories and a freshly computed one -- used to
 *  decide whether a cached summary is stale. */
export function sourcedCategoriesEqual(
  cached: Record<string, string[]> | undefined,
  fresh: Record<string, ScoreSource[]>,
): boolean {
  if (!cached) return false
  const cachedKeys = Object.keys(cached)
  const freshKeys = Object.keys(fresh)
  if (cachedKeys.length !== freshKeys.length) return false

  for (const key of freshKeys) {
    const cachedSources = cached[key]
    const freshSources = fresh[key]
    if (!cachedSources || cachedSources.length !== freshSources.length) return false
    const cachedSet = new Set(cachedSources)
    if (!freshSources.every(s => cachedSet.has(s))) return false
  }
  return true
}
