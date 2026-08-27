import type { EffectiveTier } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const TIER_LABEL: Record<EffectiveTier, string> = {
  free: 'Free',
  trial: 'Trial',
  coach: 'Coach Pro',
  club: 'Club',
}

// Differentiated by treatment (outline / low-opacity fill / solid fill) on
// the single brand accent, never by hue -- see DESIGN.md's One Accent Rule.
const TIER_CLASSES: Record<EffectiveTier, string> = {
  free: 'text-muted-foreground border-border bg-transparent',
  trial: 'text-primary border-primary/40 bg-transparent',
  coach: 'text-primary border-primary/20 bg-primary/10',
  club: 'text-primary-foreground border-transparent bg-primary',
}

export function TierBadge({ tier }: { tier: EffectiveTier }) {
  return (
    <span title="Subscription tier" className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', TIER_CLASSES[tier])}>
      {TIER_LABEL[tier]}
    </span>
  )
}
