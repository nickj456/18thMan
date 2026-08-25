const COOLDOWN_MONTHS = 3

export interface RetakeEligibility {
  eligible: boolean
  /** The date retake becomes allowed. Always null when eligible is true. */
  eligibleAt: Date | null
}

/** A coach may retake their self-assessment COOLDOWN_MONTHS after their most
 *  recently COMPLETED attempt — starting-but-abandoning an attempt never
 *  starts or resets this clock, only finishing one does. `lastCompletedAt`
 *  is that attempt's `completed_at` (ISO string), or null if the coach has
 *  never completed one (always eligible in that case). */
export function retakeEligibility(lastCompletedAt: string | null): RetakeEligibility {
  if (!lastCompletedAt) return { eligible: true, eligibleAt: null }
  const eligibleAt = new Date(lastCompletedAt)
  eligibleAt.setMonth(eligibleAt.getMonth() + COOLDOWN_MONTHS)
  const eligible = eligibleAt.getTime() <= Date.now()
  return { eligible, eligibleAt: eligible ? null : eligibleAt }
}
