import { labelFor } from './categories'
import { firstSentence } from './narrative'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export interface CoachDnaCardData {
  primaryLabel: string
  secondaryLabel: string | null
  narrativeSnippet: string | null
  strengthLabels: string[]
  focusAreaLabels: string[]
}

/** The facts the branded result-card image shows -- the same coaching type
 *  and narrative the hub page's condensed snapshot leads with, plus the
 *  full strength/focus-area lists, so the card and the page always agree. */
export function buildCardData(summary: SelfAssessmentSummary): CoachDnaCardData {
  return {
    primaryLabel: labelFor(summary.primaryType),
    secondaryLabel: summary.secondaryType ? labelFor(summary.secondaryType) : null,
    narrativeSnippet: summary.narrative ? firstSentence(summary.narrative) : null,
    strengthLabels: summary.pros.map(p => labelFor(p.categorySlug)),
    focusAreaLabels: summary.cons.map(c => labelFor(c.categorySlug)),
  }
}
