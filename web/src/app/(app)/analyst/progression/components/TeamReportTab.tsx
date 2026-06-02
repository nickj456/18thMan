'use client'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'
interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  matchAId: string | null
  matchBId: string | null
  compareMode: boolean
  statTypes: string[]
  resolvedPlayers: ResolvedPlayer[]
}
export function TeamReportTab(_: Props) { return null }
