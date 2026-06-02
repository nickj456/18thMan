// web/src/lib/match-analysis/aggregate.ts
import type {
  MatchSession,
  MatchSessionWithAnalyst,
  ResolvedPlayer,
  SessionEvent,
  TrendDirection,
  PlayerStatSummary,
} from '@/lib/supabase/types'

// ── Stat polarity ──────────────────────────────────────────────────────────────

export const STAT_POLARITY: Record<string, 'positive' | 'negative'> = {
  carry:             'positive',
  tackle:            'positive',
  set_completion:    'positive',
  penalty_won:       'positive',
  penalty_conceded:  'negative',
}

export function getPolarity(statType: string): 'positive' | 'negative' {
  return STAT_POLARITY[statType] ?? 'positive'
}

// ── Player keys ────────────────────────────────────────────────────────────────

export function buildPlayerKey(name: string, number: number): string {
  return `${name.trim().toLowerCase()}::${number}`
}

// ── Stat counting ──────────────────────────────────────────────────────────────

export function countEvents(
  events: SessionEvent[],
  playerKey?: string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const ev of events) {
    if (playerKey) {
      const key = buildPlayerKey(ev.playerName, ev.playerNumber)
      if (key !== playerKey) continue
    }
    counts[ev.type] = (counts[ev.type] ?? 0) + 1
  }
  return counts
}

// ── Stat types across sessions ─────────────────────────────────────────────────

export function getAllStatTypes(sessions: MatchSession[]): string[] {
  const types = new Set<string>()
  for (const s of sessions) {
    for (const ev of s.events) {
      types.add(ev.type)
    }
  }
  return Array.from(types).sort()
}

// ── Player identity resolution ─────────────────────────────────────────────────

export function resolvePlayers(sessions: MatchSession[]): ResolvedPlayer[] {
  const byNormName = new Map<
    string,
    { displayName: string; numbers: Set<number>; sessionIds: Set<string> }
  >()

  for (const session of sessions) {
    for (const p of session.players) {
      if (p.isOpposition) continue
      const norm = p.name.trim().toLowerCase()
      if (!byNormName.has(norm)) {
        byNormName.set(norm, {
          displayName: p.name.trim(),
          numbers: new Set(),
          sessionIds: new Set(),
        })
      }
      const entry = byNormName.get(norm)!
      entry.numbers.add(p.number)
      entry.sessionIds.add(session.id)
    }
  }

  return Array.from(byNormName.values())
    .map(({ displayName, numbers, sessionIds }) => {
      const allNumbers = Array.from(numbers).sort((a, b) => a - b)
      return {
        key: buildPlayerKey(displayName, allNumbers[0]),
        name: displayName,
        primaryNumber: allNumbers[0],
        allNumbers,
        numberMismatch: allNumbers.length > 1,
        sessionCount: sessionIds.size,
      }
    })
    .sort((a, b) => a.primaryNumber - b.primaryNumber)
}

// ── Trend analysis ─────────────────────────────────────────────────────────────

export function detectConsecutiveDecline(values: number[]): boolean {
  if (values.length < 3) return false
  let streak = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      streak++
      if (streak >= 2) return true // 3 values = 2 consecutive drops
    } else {
      streak = 0
    }
  }
  return false
}

export function computeTrend(values: number[]): TrendDirection {
  if (values.length < 2) return 'flat'
  const half = Math.ceil(values.length / 2)
  const firstHalf = values.slice(0, half)
  const lastHalf = values.slice(values.length - half)
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgLast = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length
  const delta = avgLast - avgFirst
  const pct = avgFirst === 0 ? 0 : Math.abs(delta / avgFirst)
  if (delta > 0) return pct > 0.2 ? 'up-strong' : 'up'
  if (delta < 0) return pct > 0.2 ? 'down-strong' : 'down'
  return 'flat'
}

// ── Player stat summaries ──────────────────────────────────────────────────────

export function computePlayerStats(
  playerKey: string,
  sessions: MatchSession[],
  includedIds: string[],
  statTypes: string[],
): PlayerStatSummary[] {
  const includedSet = new Set(includedIds)
  const includedSessions = sessions
    .filter(s => includedSet.has(s.id))
    .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? ''))

  return statTypes.map(statType => {
    const values = includedSessions.map(
      s => countEvents(s.events, playerKey)[statType] ?? 0,
    )
    const nonZero = values.filter(v => v > 0)
    return {
      statType,
      values,
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      best: nonZero.length ? Math.max(...values) : 0,
      worst: nonZero.length ? Math.min(...values) : 0,
      trend: computeTrend(values),
      hasDecline: detectConsecutiveDecline(values),
    }
  })
}

// ── Heatmap computation ────────────────────────────────────────────────────────

export interface HeatmapCell {
  sessionId: string
  statType: string
  value: number
  isAboveAverage: boolean
  isExcluded: boolean
}

export function computeHeatmap(
  sessions: MatchSessionWithAnalyst[],
  includedIds: string[],
  statTypes: string[],
): HeatmapCell[] {
  const includedSet = new Set(includedIds)
  const cells: HeatmapCell[] = []

  // Per-stat averages across included sessions only
  const statAverages: Record<string, number> = {}
  for (const statType of statTypes) {
    const includedValues = sessions
      .filter(s => includedSet.has(s.id))
      .map(s => countEvents(s.events)[statType] ?? 0)
    statAverages[statType] =
      includedValues.length
        ? includedValues.reduce((a, b) => a + b, 0) / includedValues.length
        : 0
  }

  for (const session of sessions) {
    const counts = countEvents(session.events)
    for (const statType of statTypes) {
      const value = counts[statType] ?? 0
      const avg = statAverages[statType] ?? 0
      const polarity = getPolarity(statType)
      const isAboveAverage =
        polarity === 'positive' ? value >= avg : value <= avg
      cells.push({
        sessionId: session.id,
        statType,
        value,
        isAboveAverage,
        isExcluded: !includedSet.has(session.id),
      })
    }
  }

  return cells
}

// ── CSV export ─────────────────────────────────────────────────────────────────

// Sanitize a CSV cell: prefix formula-injection triggers with a single quote,
// and wrap cells containing special chars in double quotes (OWASP guidance).
function escapeCsvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildTeamReportCsv(
  sessions: MatchSessionWithAnalyst[],
  includedIds: string[],
  statTypes: string[],
): string {
  const includedSessions = sessions.filter(s => includedIds.includes(s.id))
  const header = [
    'Stat',
    ...includedSessions.map(
      s => `${s.opposition ?? 'Unknown'} (${s.match_date ?? '—'})`,
    ),
  ]
  const rows = statTypes.map(statType => {
    const cells = includedSessions.map(
      s => String(countEvents(s.events)[statType] ?? 0),
    )
    return [statType, ...cells]
  })
  return [header, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\n')
}

export function buildReportCardsCsv(
  players: ResolvedPlayer[],
  selectedKeys: string[],
  sessions: MatchSession[],
  includedIds: string[],
  statTypes: string[],
): string {
  const header = ['Player', 'Jersey', 'Stat', 'Avg', 'Best', 'Worst', 'Trend']
  const rows: string[][] = []
  for (const player of players.filter(p => selectedKeys.includes(p.key))) {
    const stats = computePlayerStats(player.key, sessions, includedIds, statTypes)
    for (const s of stats) {
      rows.push([
        player.name,
        String(player.primaryNumber),
        s.statType,
        s.avg.toFixed(1),
        String(s.best),
        String(s.worst),
        s.trend,
      ])
    }
  }
  return [header, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\n')
}
