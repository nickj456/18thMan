import { labelFor } from './categories'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export interface CoachDnaCardData {
  primaryLabel: string
  secondaryLabel: string | null
  topStrengthLabel: string | null
  focusAreaLabel: string | null
}

/** The handful of facts the branded result-card image shows -- the same
 *  three facts the hub page's condensed snapshot leads with, so the card
 *  and the page always agree. */
export function buildCardData(summary: SelfAssessmentSummary): CoachDnaCardData {
  return {
    primaryLabel: labelFor(summary.primaryType),
    secondaryLabel: summary.secondaryType ? labelFor(summary.secondaryType) : null,
    topStrengthLabel: summary.pros[0] ? labelFor(summary.pros[0].categorySlug) : null,
    focusAreaLabel: summary.cons[0] ? labelFor(summary.cons[0].categorySlug) : null,
  }
}
