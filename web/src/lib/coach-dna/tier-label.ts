import type { CategoryTier } from './archetype'

const TIER_LABELS: Record<CategoryTier, string> = {
  strength: 'Strong',
  solid: 'Developing',
  focus: 'Focus area',
}

/** Plain-language band for a category tier, shown alongside its raw score everywhere a category is displayed (hub, /complete, both PDFs). */
export function tierLabel(tier: CategoryTier): string {
  return TIER_LABELS[tier]
}
