import type { SelfAssessmentSummary } from '@/lib/supabase/types'

/**
 * True if a persisted summary already has the current shape: an array of all
 * 8 categories (not the old top/bottom-3 `pros`/`cons` split), each carrying
 * a `resources` array. A summary from before this shape shipped (or before
 * the growth-resources feature that preceded it) lacks one or both and must
 * be regenerated, not rendered as-is -- rendering it directly would throw on
 * `category.resources.length` or `category.categories` being undefined.
 */
export function isCurrentSummaryShape(summary: SelfAssessmentSummary): boolean {
  return Array.isArray(summary.categories) && summary.categories.every(category => Array.isArray(category.resources))
}
