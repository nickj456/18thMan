'use client'

import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { PlayerReportCard } from './PlayerReportCard'
import { ExportPanel } from './ExportPanel'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
  statTypes: string[]
}

export function ReportCardsTab({ sessions, includedIds, resolvedPlayers, statTypes }: Props) {
  const eligiblePlayers = useMemo(
    () => resolvedPlayers.filter(p => p.sessionCount >= 2),
    [resolvedPlayers],
  )

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    eligiblePlayers.map(p => p.key),
  )
  const [exportOpen, setExportOpen] = useState(false)

  function toggleSelect(key: string) {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  function selectAll() {
    setSelectedKeys(eligiblePlayers.map(p => p.key))
  }

  function deselectAll() {
    setSelectedKeys([])
  }

  if (!eligiblePlayers.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-zinc-500">No players appear in 2+ included sessions.</p>
        <p className="text-xs text-zinc-600">Include more matches or upload additional sessions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
            {eligiblePlayers.length} players · {selectedKeys.length} selected
          </p>
          <button onClick={selectAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            All
          </button>
          <button onClick={deselectAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            None
          </button>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/25 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {eligiblePlayers.map(player => (
          <PlayerReportCard
            key={player.key}
            player={player}
            sessions={sessions}
            includedIds={includedIds}
            statTypes={statTypes}
            selected={selectedKeys.includes(player.key)}
            onToggleSelect={() => toggleSelect(player.key)}
          />
        ))}
      </div>

      <ExportPanel
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        sessions={sessions}
        players={eligiblePlayers}
        statTypes={statTypes}
        defaultIncludedIds={includedIds}
        defaultSelectedKeys={selectedKeys}
      />
    </div>
  )
}
