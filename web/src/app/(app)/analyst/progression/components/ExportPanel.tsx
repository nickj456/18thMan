'use client'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'
interface Props {
  open: boolean
  onClose: () => void
  sessions: MatchSessionWithAnalyst[]
  players: ResolvedPlayer[]
  statTypes: string[]
  defaultIncludedIds: string[]
  defaultSelectedKeys: string[]
}
export function ExportPanel(_: Props) { return null }
