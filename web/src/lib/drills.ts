import type { DrillWithRelations } from '@/lib/supabase/types'

export function drillStats(drill: Pick<DrillWithRelations, 'drill_ratings'>) {
  const rows = drill.drill_ratings ?? []
  const scored = rows.filter(r => r.rating != null)
  const avgRating = scored.length
    ? scored.reduce((s, r) => s + r.rating!, 0) / scored.length
    : undefined
  const commentCount = rows.filter(r => r.comment?.trim()).length
  return { avgRating, commentCount }
}
