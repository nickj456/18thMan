'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MatchSelectorBar } from './components/MatchSelectorBar'
import { TeamReportTab } from './components/TeamReportTab'
import { ReportCardsTab } from './components/ReportCardsTab'
import { resolvePlayers, getAllStatTypes } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
}

export function ProgressionClient({ sessions }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const includedIds = useMemo(() => {
    const raw = searchParams.get('included')
    if (!raw) return sessions.map(s => s.id)
    return raw.split(',').filter(id => sessions.some(s => s.id === id))
  }, [searchParams, sessions])

  const matchAId = searchParams.get('a') ?? null
  const matchBId = searchParams.get('b') ?? null
  const compareMode = searchParams.get('compare') === '1'
  const activeTab = searchParams.get('tab') ?? 'team'

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k)
        else params.set(k, v)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggleIncluded = useCallback(
    (id: string) => {
      const next = includedIds.includes(id)
        ? includedIds.filter(x => x !== id)
        : [...includedIds, id]
      setParams({ included: next.join(',') })
    },
    [includedIds, setParams],
  )

  const toggleCompareMode = useCallback(() => {
    setParams({
      compare: compareMode ? null : '1',
      a: compareMode ? null : matchAId,
      b: compareMode ? null : matchBId,
    })
  }, [compareMode, matchAId, matchBId, setParams])

  const selectMatchA = useCallback(
    (id: string) => setParams({ a: id }),
    [setParams],
  )

  const selectMatchB = useCallback(
    (id: string) => setParams({ b: id }),
    [setParams],
  )

  const resolvedPlayers = useMemo(
    () => resolvePlayers(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  const statTypes = useMemo(
    () => getAllStatTypes(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  return (
    <div className="space-y-0 -mx-6">
      <MatchSelectorBar
        sessions={sessions}
        includedIds={includedIds}
        matchAId={matchAId}
        matchBId={matchBId}
        compareMode={compareMode}
        onToggleIncluded={toggleIncluded}
        onToggleCompareMode={toggleCompareMode}
        onSelectA={selectMatchA}
        onSelectB={selectMatchB}
      />

      <div className="px-6 pt-6">
        <Tabs
          value={activeTab}
          onValueChange={v => setParams({ tab: v })}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="team">Team Report</TabsTrigger>
            <TabsTrigger value="cards">Report Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamReportTab
              sessions={sessions}
              includedIds={includedIds}
              matchAId={matchAId}
              matchBId={matchBId}
              compareMode={compareMode}
              statTypes={statTypes}
              resolvedPlayers={resolvedPlayers}
            />
          </TabsContent>

          <TabsContent value="cards">
            <ReportCardsTab
              sessions={sessions}
              includedIds={includedIds}
              resolvedPlayers={resolvedPlayers}
              statTypes={statTypes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
