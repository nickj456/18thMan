'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addEvent, undoEvent } from './actions'
import type { GameStatSessionWithMatch, GameStatEvent, StatType } from '@/lib/supabase/types'
import type { Player } from '@/lib/supabase/types'

interface Props {
  session: GameStatSessionWithMatch
  players: Pick<Player, 'id' | 'name'>[]
  initialEvents: GameStatEvent[]
  currentUserId: string
  groupId: string
  canTap: boolean
}

type Tab = 'carries' | 'tackles' | 'sets'
type Mode = 'tap' | 'review'

export function GameStatsClient({
  session,
  players,
  initialEvents,
  currentUserId,
  groupId,
  canTap,
}: Props) {
  const [events, setEvents] = useState<GameStatEvent[]>(initialEvents)
  const [mode, setMode] = useState<Mode>('tap')
  const [activeTab, setActiveTab] = useState<Tab>('carries')
  const [activeHalf, setActiveHalf] = useState<1 | 2>(1)

  const match = Array.isArray(session.match) ? session.match[0] : session.match

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`game_stats:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_stat_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setEvents(prev => {
            if (prev.some(e => e.id === payload.new.id)) return prev
            return [...prev, payload.new as GameStatEvent]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'game_stat_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setEvents(prev => prev.filter(e => e.id !== (payload.old as GameStatEvent).id))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Derived counts ──────────────────────────────────────────────────────────
  const carryEvents  = useMemo(() => events.filter(e => e.stat_type === 'carry'), [events])
  const tackleEvents = useMemo(() => events.filter(e => e.stat_type === 'tackle'), [events])
  const setEventsAll = useMemo(() => events.filter(e => e.stat_type === 'set_completion'), [events])

  const totalCarries  = carryEvents.length
  const totalTackles  = tackleEvents.length
  const setsCompleted = setEventsAll.filter(e => e.completed).length
  const setsTotal     = setEventsAll.length

  function playerCount(playerId: string, statType: 'carry' | 'tackle') {
    return events.filter(e => e.player_id === playerId && e.stat_type === statType).length
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  async function handleAdd(
    statType: StatType,
    playerId: string | null,
    completed: boolean | null,
  ) {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimistic: GameStatEvent = {
      id: tempId,
      session_id: session.id,
      player_id: playerId,
      stat_type: statType,
      half: activeHalf,
      completed,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [...prev, optimistic])

    const result = await addEvent(session.id, statType, activeHalf, playerId, completed)
    if ('error' in result) {
      setEvents(prev => prev.filter(e => e.id !== tempId))
    } else {
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: result.id } : e))
    }
  }

  async function handleUndo(statType: 'carry' | 'tackle', playerId: string) {
    const target = [...events]
      .reverse()
      .find(
        e =>
          e.stat_type === statType &&
          e.player_id === playerId &&
          e.created_by === currentUserId &&
          !e.id.startsWith('temp-'),
      )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  async function handleUndoSet() {
    const target = [...events]
      .reverse()
      .find(
        e =>
          e.stat_type === 'set_completion' &&
          e.created_by === currentUserId &&
          !e.id.startsWith('temp-'),
      )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const matchDate = match
    ? new Date(match.match_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short',
      })
    : ''

  return (
    <div className="max-w-lg space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="app-heading text-xl">
            vs {match?.opponent ?? '—'}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{matchDate} · Live</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Mode toggle */}
      {canTap && (
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden mb-3">
          {(['tap', 'review'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                mode === m
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'tap' ? 'Tap' : 'Review'}
            </button>
          ))}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden mb-3">
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a]">Carries</p>
          <p className="text-2xl font-bold text-white mt-0.5">{totalCarries}</p>
        </div>
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Tackles</p>
          <p className="text-2xl font-bold text-white mt-0.5">{totalTackles}</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Sets</p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {setsCompleted}/{setsTotal}
          </p>
        </div>
      </div>

      {mode === 'tap' && canTap ? (
        <>
          {/* Tab bar */}
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden mb-3">
            {(['carries', 'tackles', 'sets'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  activeTab === t
                    ? 'text-[#e8560a] border-b-2 border-[#e8560a]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'carries' && (
            <PlayerStatTab
              players={players}
              statType="carry"
              playerCount={playerCount}
              canTap={canTap}
              onAdd={(playerId) => handleAdd('carry', playerId, null)}
              onUndo={(playerId) => handleUndo('carry', playerId)}
            />
          )}
          {activeTab === 'tackles' && (
            <PlayerStatTab
              players={players}
              statType="tackle"
              playerCount={playerCount}
              canTap={canTap}
              onAdd={(playerId) => handleAdd('tackle', playerId, null)}
              onUndo={(playerId) => handleUndo('tackle', playerId)}
            />
          )}
          {activeTab === 'sets' && (
            <SetsTab
              events={setEventsAll}
              activeHalf={activeHalf}
              onHalfChange={setActiveHalf}
              onAdd={(completed) => handleAdd('set_completion', null, completed)}
              onUndoLast={handleUndoSet}
            />
          )}
        </>
      ) : (
        <ReviewPanel
          players={players}
          carryEvents={carryEvents}
          tackleEvents={tackleEvents}
          setEvents={setEventsAll}
          sessionId={session.id}
          groupId={groupId}
          opponent={match?.opponent ?? '—'}
          matchDate={match?.match_date ?? ''}
        />
      )}
    </div>
  )
}

// ── PlayerStatTab ─────────────────────────────────────────────────────────────

function PlayerStatTab({
  players,
  statType,
  playerCount,
  canTap,
  onAdd,
  onUndo,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  statType: 'carry' | 'tackle'
  playerCount: (playerId: string, statType: 'carry' | 'tackle') => number
  canTap: boolean
  onAdd: (playerId: string) => void
  onUndo: (playerId: string) => void
}) {
  const accentClass = statType === 'carry' ? 'bg-[#e8560a]' : 'bg-blue-500'

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <ul className="divide-y divide-zinc-800 bg-zinc-900">
        {players.map(p => {
          const count = playerCount(p.id, statType)
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-zinc-200 truncate">{p.name}</span>
              <span className="text-lg font-bold text-white w-8 text-right">{count}</span>
              {canTap && (
                <>
                  <button
                    onClick={() => onUndo(p.id)}
                    disabled={count === 0}
                    aria-label={`Undo last ${statType} for ${p.name}`}
                    className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-400 transition-colors text-base"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() => onAdd(p.id)}
                    aria-label={`Add ${statType} for ${p.name}`}
                    className={`w-9 h-9 rounded-lg ${accentClass} hover:opacity-90 flex items-center justify-center text-white font-bold text-xl transition-opacity active:scale-95`}
                  >
                    +
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── SetsTab ───────────────────────────────────────────────────────────────────

function SetsTab({
  events,
  activeHalf,
  onHalfChange,
  onAdd,
  onUndoLast,
}: {
  events: GameStatEvent[]
  activeHalf: 1 | 2
  onHalfChange: (half: 1 | 2) => void
  onAdd: (completed: boolean) => void
  onUndoLast: () => void
}) {
  const halfEvents = events.filter(e => e.half === activeHalf)
  const completed  = halfEvents.filter(e => e.completed).length
  const total      = halfEvents.length
  const rate       = total > 0 ? Math.round((completed / total) * 100) : 0
  const last5      = [...halfEvents].slice(-5)

  return (
    <div className="space-y-3">
      {/* Half toggle */}
      <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
        {([1, 2] as const).map(h => (
          <button
            key={h}
            onClick={() => onHalfChange(h)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeHalf === h
                ? 'bg-[#e8560a] text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {h === 1 ? '1st Half' : '2nd Half'}
          </button>
        ))}
      </div>

      {/* Big YES / NO buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAdd(true)}
          className="py-6 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all"
        >
          YES — COMPLETE ✓
        </button>
        <button
          onClick={() => onAdd(false)}
          className="py-6 rounded-xl bg-red-900/40 border border-red-700/40 text-red-400 font-bold text-lg hover:bg-red-800/50 active:scale-95 transition-all"
        >
          NO — INCOMPLETE ✗
        </button>
      </div>

      {/* Running tally */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Complete</p>
          <p className="text-2xl font-bold text-emerald-400">{completed}</p>
        </div>
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Incomplete</p>
          <p className="text-2xl font-bold text-red-400">{total - completed}</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Rate</p>
          <p className="text-2xl font-bold text-white">{rate}%</p>
        </div>
      </div>

      {/* Last 5 sets */}
      {last5.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Last {last5.length} sets
          </p>
          <div className="flex gap-2">
            {last5.map(e => (
              <div
                key={e.id}
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  e.completed
                    ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/40'
                    : 'bg-red-900/60 text-red-400 border border-red-700/40'
                }`}
              >
                {e.completed ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Undo last */}
      {total > 0 && (
        <button
          onClick={onUndoLast}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
        >
          Undo last set
        </button>
      )}
    </div>
  )
}

// ── ReviewPanel ───────────────────────────────────────────────────────────────

function ReviewPanel({
  players,
  carryEvents,
  tackleEvents,
  setEvents,
  sessionId,
  groupId,
  opponent,
  matchDate,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  carryEvents: GameStatEvent[]
  tackleEvents: GameStatEvent[]
  setEvents: GameStatEvent[]
  sessionId: string
  groupId: string
  opponent: string
  matchDate: string
}) {
  const carriesByPlayer = players
    .map(p => ({ ...p, count: carryEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const tacklesByPlayer = players
    .map(p => ({ ...p, count: tackleEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const h1Sets      = setEvents.filter(e => e.half === 1)
  const h2Sets      = setEvents.filter(e => e.half === 2)
  const h1Completed = h1Sets.filter(e => e.completed).length
  const h2Completed = h2Sets.filter(e => e.completed).length

  const reviewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/groups/${groupId}/game-stats/${sessionId}`
    : ''

  const date = matchDate
    ? new Date(matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  const shareText = encodeURIComponent(
    `18th Man — Game Stats\nvs ${opponent} · ${date}\n\nCarries: ${carryEvents.length} | Tackles: ${tackleEvents.length} | Sets: ${h1Completed + h2Completed}/${setEvents.length}\n\n${reviewUrl}`,
  )

  function copyLink() {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(reviewUrl)
  }

  return (
    <div className="space-y-4">
      {/* Carries */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a] mb-2">
          Attack — Carries
        </h2>
        {carriesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No carries recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {carriesByPlayer.map(p => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-200">{p.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8560a]/20 text-[#e8560a]">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tackles */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
          Defence — Tackles
        </h2>
        {tacklesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No tackles recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {tacklesByPlayer.map(p => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-200">{p.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Set completion */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Set Completion
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">1st Half</p>
            <p className="text-2xl font-bold text-white">
              {h1Completed}/{h1Sets.length}
            </p>
            {h1Sets.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((h1Completed / h1Sets.length) * 100)}%
              </p>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">2nd Half</p>
            <p className="text-2xl font-bold text-white">
              {h2Completed}/{h2Sets.length}
            </p>
            {h2Sets.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((h2Completed / h2Sets.length) * 100)}%
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Share bar */}
      <div className="flex gap-2 pt-2">
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-lg border border-emerald-700/40 text-emerald-400 text-xs font-semibold text-center hover:bg-emerald-900/30 transition-colors"
        >
          WhatsApp
        </a>
        <a
          href={`/api/game-stats/${sessionId}/pdf`}
          download
          className="flex-1 py-2.5 rounded-lg border border-[#e8560a]/40 text-[#e8560a] text-xs font-semibold text-center hover:bg-[#e8560a]/10 transition-colors"
        >
          PDF
        </a>
        <button
          onClick={copyLink}
          className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-semibold hover:bg-zinc-800 transition-colors"
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}
