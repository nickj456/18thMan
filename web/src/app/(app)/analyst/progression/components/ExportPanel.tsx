'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { buildTeamReportCsv, buildReportCardsCsv } from '@/lib/match-analysis/aggregate'
import { generateProgressionPdf } from '../actions'
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

export function ExportPanel({
  open,
  onClose,
  sessions,
  players,
  statTypes,
  defaultIncludedIds,
  defaultSelectedKeys,
}: Props) {
  const [selectedIncluded, setSelectedIncluded] = useState<string[]>(defaultIncludedIds)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(defaultSelectedKeys)
  const [sections, setSections] = useState<string[]>(['team', 'cards'])
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleMatch(id: string) {
    setSelectedIncluded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function togglePlayer(key: string) {
    setSelectedPlayers(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  function toggleSection(s: string) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function downloadBlob(data: BlobPart, filename: string, type: string) {
    const blob = new Blob([data], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExport() {
    setError(null)

    if (format === 'csv') {
      if (sections.includes('team')) {
        const csv = buildTeamReportCsv(sessions, selectedIncluded, statTypes)
        downloadBlob(csv, 'team-report.csv', 'text/csv')
      }
      if (sections.includes('cards')) {
        const csv = buildReportCardsCsv(players, selectedPlayers, sessions, selectedIncluded, statTypes)
        downloadBlob(csv, 'player-report-cards.csv', 'text/csv')
      }
      onClose()
      return
    }

    // PDF via server action
    startTransition(async () => {
      const result = await generateProgressionPdf({
        sessionIds: selectedIncluded,
        playerKeys: selectedPlayers,
        sections,
        statTypes,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.pdf) {
        const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))
        downloadBlob(bytes, 'match-analysis.pdf', 'application/pdf')
        onClose()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Export Report</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Matches */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Matches</p>
            <div className="space-y-1.5">
              {sessions.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIncluded.includes(s.id)}
                    onChange={() => toggleMatch(s.id)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">
                    vs {s.opposition ?? '—'} · {s.match_date ?? '—'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Players</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPlayers(players.map(p => p.key))} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">All</button>
                <button onClick={() => setSelectedPlayers([])} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">None</button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {players.map(p => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(p.key)}
                    onChange={() => togglePlayer(p.key)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">#{p.primaryNumber} {p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sections</p>
            <div className="space-y-1.5">
              {[
                { id: 'team', label: 'Team Report (comparison + heatmap)' },
                { id: 'cards', label: 'Player Report Cards' },
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sections.includes(id)}
                    onChange={() => toggleSection(id)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {(['pdf', 'csv'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm border transition-colors',
                    format === f
                      ? 'bg-[#e8560a]/15 border-[#e8560a]/40 text-[#e8560a]'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleExport}
            disabled={isPending || sections.length === 0 || selectedIncluded.length === 0}
            className="w-full py-2.5 rounded-lg bg-[#e8560a] text-white text-sm font-semibold hover:bg-[#d14d09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Generating…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
