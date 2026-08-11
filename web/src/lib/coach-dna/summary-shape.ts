import type { SelfAssessmentSummary } from '@/lib/supabase/types'

/**
 * True if a persisted summary already has the current shape (every con
 * carries a resources array). Summaries generated before the growth-resources
 * feature shipped lack this field and must be regenerated, not rendered as-is
 * — rendering them directly would throw on `con.resources.length`.
 */
export function isCurrentSummaryShape(summary: SelfAssessmentSummary): boolean {
  return summary.cons.every(con => Array.isArray(con.resources))
}
