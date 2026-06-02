'use client'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'
interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
  statTypes: string[]
}
export function ReportCardsTab(_: Props) { return null }
