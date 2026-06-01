'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addEvent, undoEvent, endSession } from './actions'
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

type Tab = 'carries' | 'tackles' | 'sets' | 'score' | 'penalties'
type Mode = 'tap' | 'review'

function workloadColor(pct: number) {
  if (pct >= 25) return 'bg-red-900/40 text-red-400 border border-red-800/40'
  if (pct >= 15) return 'bg-amber-900/40 text-amber-400 border border-amber-800/40'
  return 'bg-zinc-800 text-zinc-500 border border-zinc-700'
}

export function GameStatsClient({
  session,
  players,
  initialEvents,
  currentUserId,
  groupId,
  canTap,
}: Props) {
  const [events, setEvents] = useState<GameStatEvent[]>(initialEvents)
  const [mode, setMode] = useState<Mode>(session.ended_at ? 'review' : 'tap')
  const [activeTab, setActiveTab] = useState<Tab>('carries')
  const [activeHalf, setActiveHalf] = useState<1 | 2>(1)
  const [isEnded, setIsEnded] = useState(!!session.ended_at)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  // ── Timer ────────────────────────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  function resetTimer() {
    setTimerRunning(false)
    setTimerSeconds(0)
  }

  const timerMins = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const timerSecs = String(timerSeconds % 60).padStart(2, '0')

  const match = Array.isArray(session.match) ? session.match[0] : session.match

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`game_stats:${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_stat_events', filter: `session_id=eq.${session.id}` }, (payload) => {
        setEvents(prev => prev.some(e => e.id === payload.new.id) ? prev : [...prev, payload.new as GameStatEvent])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'game_stat_events', filter: `session_id=eq.${session.id}` }, (payload) => {
        setEvents(prev => prev.filter(e => e.id !== (payload.old as GameStatEvent).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Derived counts ──────────────────────────────────────────────────────────
  const carryEvents       = useMemo(() => events.filter(e => e.stat_type === 'carry'), [events])
  const tackleEvents      = useMemo(() => events.filter(e => e.stat_type === 'tackle'), [events])
  const setEventsAll      = useMemo(() => events.filter(e => e.stat_type === 'set_completion'), [events])
  const tryEvents         = useMemo(() => events.filter(e => e.stat_type === 'try'), [events])
  const conversionEvents  = useMemo(() => events.filter(e => e.stat_type === 'conversion'), [events])
  const oppTryEvents      = useMemo(() => events.filter(e => e.stat_type === 'opposition_try'), [events])
  const oppConvEvents     = useMemo(() => events.filter(e => e.stat_type === 'opposition_conversion'), [events])
  const penaltyWonEvents      = useMemo(() => events.filter(e => e.stat_type === 'penalty_won'), [events])
  const penaltyConcededEvents = useMemo(() => events.filter(e => e.stat_type === 'penalty_conceded'), [events])

  const ourScore   = tryEvents.length * 4 + conversionEvents.length * 2
  const theirScore = oppTryEvents.length * 4 + oppConvEvents.length * 2

  const totalCarries  = carryEvents.length
  const totalTackles  = tackleEvents.length
  const setsCompleted = setEventsAll.filter(e => e.completed).length
  const setsTotal     = setEventsAll.length

  function playerCount(playerId: string, statType: 'carry' | 'tackle' | 'try') {
    return events.filter(e => e.player_id === playerId && e.stat_type === statType && e.half === activeHalf).length
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  async function handleAdd(statType: StatType, playerId: string | null, completed: boolean | null) {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimistic: GameStatEvent = {
      id: tempId, session_id: session.id, player_id: playerId,
      stat_type: statType, half: activeHalf, completed,
      created_by: currentUserId, created_at: new Date().toISOString(),
    }
    setEvents(prev => [...prev, optimistic])
    const result = await addEvent(session.id, statType, activeHalf, playerId, completed)
    if ('error' in result) {
      setEvents(prev => prev.filter(e => e.id !== tempId))
    } else {
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: result.id } : e))
    }
  }

  async function handleUndo(statType: 'carry' | 'tackle' | 'try', playerId: string) {
    const target = [...events].reverse().find(
      e => e.stat_type === statType && e.player_id === playerId && e.half === activeHalf && e.created_by === currentUserId && !e.id.startsWith('temp-'),
    )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  async function handleUndoNoPlayer(statType: 'set_completion' | 'conversion' | 'opposition_try' | 'opposition_conversion' | 'penalty_won' | 'penalty_conceded') {
    const target = [...events].reverse().find(
      e => e.stat_type === statType && e.half === activeHalf && e.created_by === currentUserId && !e.id.startsWith('temp-'),
    )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  async function handleEndMatch() {
    setIsEnding(true)
    setTimerRunning(false)
    const result = await endSession(session.id)
    if (!result.error) {
      setIsEnded(true)
      setMode('review')
      setConfirmEnd(false)
    }
    setIsEnding(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const matchDate = match
    ? new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : ''

  return (
    <div className="max-w-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-xl">vs {match?.opponent ?? '—'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-zinc-500">{matchDate}</p>
            {(ourScore > 0 || theirScore > 0) && (
              <p className="text-sm font-bold">
                <span className="text-[#e8560a]">{ourScore}</span>
                <span className="text-zinc-600"> — </span>
                <span className="text-zinc-300">{theirScore}</span>
              </p>
            )}
          </div>
        </div>
        {isEnded ? (
          <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full font-semibold">
            Final
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* End match confirmation */}
      {confirmEnd && !isEnded && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300 font-medium">End the match? This can't be undone.</p>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setConfirmEnd(false)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleEndMatch} disabled={isEnding} className="px-3 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 transition-colors">
              {isEnding ? 'Ending…' : 'End Match'}
            </button>
          </div>
        </div>
      )}

      {/* Timer */}
      {canTap && !isEnded && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <span className="font-mono text-2xl font-bold text-white tracking-widest w-20">
            {timerMins}:{timerSecs}
          </span>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setTimerRunning(r => !r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                timerRunning
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
              }`}
            >
              {timerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start'}
            </button>
            <button
              onClick={resetTimer}
              disabled={timerSeconds === 0}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Half toggle */}
      {canTap && mode === 'tap' && !isEnded && (
        <div className="flex rounded-xl border border-zinc-800 overflow-hidden">
          {([1, 2] as const).map(h => (
            <button
              key={h}
              onClick={() => setActiveHalf(h)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                activeHalf === h ? 'bg-[#e8560a] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {h === 1 ? '1st Half' : '2nd Half'}
            </button>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      {canTap && (
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
          {(['tap', 'review'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m === 'tap' && isEnded}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                mode === m ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'tap' ? 'Tap' : 'Review'}
            </button>
          ))}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden">
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
          <p className="text-2xl font-bold text-white mt-0.5">{setsCompleted}/{setsTotal}</p>
        </div>
      </div>

      {mode === 'tap' && canTap && !isEnded ? (
        <>
          {/* Tab bar */}
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
            {(['carries', 'tackles', 'sets', 'score', 'penalties'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  activeTab === t ? 'text-[#e8560a] border-b-2 border-[#e8560a]' : 'text-zinc-500 hover:text-zinc-300'
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
              onAdd={(id) => handleAdd('carry', id, null)}
              onUndo={(id) => handleUndo('carry', id)}
            />
          )}
          {activeTab === 'tackles' && (
            <PlayerStatTab
              players={players}
              statType="tackle"
              playerCount={playerCount}
              onAdd={(id) => handleAdd('tackle', id, null)}
              onUndo={(id) => handleUndo('tackle', id)}
            />
          )}
          {activeTab === 'sets' && (
            <SetsTab
              events={setEventsAll}
              activeHalf={activeHalf}
              onAdd={(completed) => handleAdd('set_completion', null, completed)}
              onUndoLast={() => handleUndoNoPlayer('set_completion')}
            />
          )}
          {activeTab === 'score' && (
            <ScoreTab
              players={players}
              playerCount={playerCount}
              ourTries={tryEvents.length}
              ourConversions={conversionEvents.length}
              oppTries={oppTryEvents.length}
              oppConversions={oppConvEvents.length}
              ourScore={ourScore}
              theirScore={theirScore}
              onAddTry={(id) => handleAdd('try', id, null)}
              onUndoTry={(id) => handleUndo('try', id)}
              onAddConversion={() => handleAdd('conversion', null, null)}
              onUndoConversion={() => handleUndoNoPlayer('conversion')}
              onAddOppTry={() => handleAdd('opposition_try', null, null)}
              onUndoOppTry={() => handleUndoNoPlayer('opposition_try')}
              onAddOppConversion={() => handleAdd('opposition_conversion', null, null)}
              onUndoOppConversion={() => handleUndoNoPlayer('opposition_conversion')}
            />
          )}
          {activeTab === 'penalties' && (
            <PenaltiesTab
              wonCount={penaltyWonEvents.filter(e => e.half === activeHalf).length}
              concededCount={penaltyConcededEvents.filter(e => e.half === activeHalf).length}
              onAddWon={() => handleAdd('penalty_won', null, null)}
              onUndoWon={() => handleUndoNoPlayer('penalty_won')}
              onAddConceded={() => handleAdd('penalty_conceded', null, null)}
              onUndoConceded={() => handleUndoNoPlayer('penalty_conceded')}
            />
          )}
        </>
      ) : (
        <>
          <ReviewPanel
            players={players}
            carryEvents={carryEvents}
            tackleEvents={tackleEvents}
            setEvents={setEventsAll}
            tryEvents={tryEvents}
            conversionEvents={conversionEvents}
            ourScore={ourScore}
            theirScore={theirScore}
            opponent={match?.opponent ?? '—'}
            sessionId={session.id}
            groupId={groupId}
            matchDate={match?.match_date ?? ''}
          />
          {canTap && !isEnded && (
            <button
              onClick={() => setConfirmEnd(true)}
              className="w-full py-2 rounded-lg border border-red-700/30 text-red-400/70 text-xs font-semibold hover:bg-red-900/20 hover:text-red-400 hover:border-red-700/50 transition-colors"
            >
              End Match
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── PlayerStatTab ─────────────────────────────────────────────────────────────

function PlayerStatTab({
  players, statType, playerCount, onAdd, onUndo,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  statType: 'carry' | 'tackle' | 'try'
  playerCount: (id: string, statType: 'carry' | 'tackle' | 'try') => number
  onAdd: (id: string) => void
  onUndo: (id: string) => void
}) {
  const accentClass = statType === 'carry' ? 'bg-[#e8560a]' : statType === 'tackle' ? 'bg-blue-500' : 'bg-emerald-600'

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <ul className="divide-y divide-zinc-800 bg-zinc-900">
        {players.map(p => {
          const count = playerCount(p.id, statType)
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-zinc-200 truncate">{p.name}</span>
              <span className="text-lg font-bold text-white w-8 text-right">{count}</span>
              <button
                onClick={() => onUndo(p.id)}
                disabled={count === 0}
                aria-label={`Undo ${statType} for ${p.name}`}
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── ScoreTab ──────────────────────────────────────────────────────────────────

function ScoreTab({
  players, playerCount,
  ourTries, ourConversions, oppTries, oppConversions, ourScore, theirScore,
  onAddTry, onUndoTry, onAddConversion, onUndoConversion,
  onAddOppTry, onUndoOppTry, onAddOppConversion, onUndoOppConversion,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  playerCount: (id: string, statType: 'carry' | 'tackle' | 'try') => number
  ourTries: number; ourConversions: number; oppTries: number; oppConversions: number
  ourScore: number; theirScore: number
  onAddTry: (id: string) => void; onUndoTry: (id: string) => void
  onAddConversion: () => void; onUndoConversion: () => void
  onAddOppTry: () => void; onUndoOppTry: () => void
  onAddOppConversion: () => void; onUndoOppConversion: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Live scoreboard */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden text-center">
        <div className="py-4 border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a] mb-1">Us</p>
          <p className="text-4xl font-bold text-white">{ourScore}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{ourTries}T {ourConversions}G</p>
        </div>
        <div className="py-4 flex items-center justify-center">
          <span className="text-2xl font-bold text-zinc-600">—</span>
        </div>
        <div className="py-4 border-l border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Them</p>
          <p className="text-4xl font-bold text-zinc-300">{theirScore}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{oppTries}T {oppConversions}G</p>
        </div>
      </div>

      {/* Our tries — per player */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Our Tries</p>
        <PlayerStatTab
          players={players}
          statType="try"
          playerCount={playerCount}
          onAdd={onAddTry}
          onUndo={onUndoTry}
        />
      </div>

      {/* Our conversion */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Our Conversion</p>
        <div className="flex gap-3">
          <button
            onClick={onAddConversion}
            className="flex-1 py-4 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all"
          >
            +2 pts
          </button>
          <button
            onClick={onUndoConversion}
            disabled={ourConversions === 0}
            className="px-5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors text-base"
          >
            ↩
          </button>
        </div>
      </div>

      {/* Opposition */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Opposition</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <button
              onClick={onAddOppTry}
              className="w-full py-4 rounded-xl bg-red-900/30 border border-red-800/40 text-red-400 font-bold text-base hover:bg-red-900/50 active:scale-95 transition-all"
            >
              Try +4
            </button>
            <button onClick={onUndoOppTry} disabled={oppTries === 0} className="w-full py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              ↩ Undo
            </button>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={onAddOppConversion}
              className="w-full py-4 rounded-xl bg-red-900/30 border border-red-800/40 text-red-400 font-bold text-base hover:bg-red-900/50 active:scale-95 transition-all"
            >
              Conv +2
            </button>
            <button onClick={onUndoOppConversion} disabled={oppConversions === 0} className="w-full py-1.5 rounded-lg text-xs border border-zinc-700 text-zinc-500 disabled:opacity-30 hover:bg-zinc-800 transition-colors">
              ↩ Undo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SetsTab ───────────────────────────────────────────────────────────────────

function SetsTab({ events, activeHalf, onAdd, onUndoLast }: {
  events: GameStatEvent[]
  activeHalf: 1 | 2
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
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onAdd(true)} className="py-6 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all">
          YES ✓
        </button>
        <button onClick={() => onAdd(false)} className="py-6 rounded-xl bg-red-900/40 border border-red-700/40 text-red-400 font-bold text-lg hover:bg-red-800/50 active:scale-95 transition-all">
          NO ✗
        </button>
      </div>

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

      {last5.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Last {last5.length} sets</p>
          <div className="flex gap-2">
            {last5.map(e => (
              <div key={e.id} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${e.completed ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/40' : 'bg-red-900/60 text-red-400 border border-red-700/40'}`}>
                {e.completed ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <button onClick={onUndoLast} className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">
          Undo last set
        </button>
      )}
    </div>
  )
}

// ── PenaltiesTab ──────────────────────────────────────────────────────────────

function PenaltiesTab({
  wonCount, concededCount, onAddWon, onUndoWon, onAddConceded, onUndoConceded,
}: {
  wonCount: number
  concededCount: number
  onAddWon: () => void
  onUndoWon: () => void
  onAddConceded: () => void
  onUndoConceded: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl border border-zinc-800 overflow-hidden text-center">
        <div className="py-3 border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Won</p>
          <p className="text-3xl font-bold text-white mt-0.5">{wonCount}</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Conceded</p>
          <p className="text-3xl font-bold text-white mt-0.5">{concededCount}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Penalty Won</p>
        <div className="flex gap-3">
          <button
            onClick={onAddWon}
            className="flex-1 py-4 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all"
          >
            + Won
          </button>
          <button
            onClick={onUndoWon}
            disabled={wonCount === 0}
            className="px-5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors text-base"
          >
            ↩
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Penalty Conceded</p>
        <div className="flex gap-3">
          <button
            onClick={onAddConceded}
            className="flex-1 py-4 rounded-xl bg-red-900/40 border border-red-700/40 text-red-400 font-bold text-lg hover:bg-red-800/50 active:scale-95 transition-all"
          >
            + Conceded
          </button>
          <button
            onClick={onUndoConceded}
            disabled={concededCount === 0}
            className="px-5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors text-base"
          >
            ↩
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ReviewPanel ───────────────────────────────────────────────────────────────

function ReviewPanel({
  players, carryEvents, tackleEvents, setEvents, tryEvents, conversionEvents,
  ourScore, theirScore, sessionId, groupId, opponent, matchDate,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  carryEvents: GameStatEvent[]
  tackleEvents: GameStatEvent[]
  setEvents: GameStatEvent[]
  tryEvents: GameStatEvent[]
  conversionEvents: GameStatEvent[]
  ourScore: number
  theirScore: number
  sessionId: string
  groupId: string
  opponent: string
  matchDate: string
}) {
  const totalCarries = carryEvents.length
  const totalTackles = tackleEvents.length

  const carriesByPlayer = players
    .map(p => ({ ...p, count: carryEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const tacklesByPlayer = players
    .map(p => ({ ...p, count: tackleEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const triesByPlayer = players
    .map(p => ({ ...p, count: tryEvents.filter(e => e.player_id === p.id).length }))
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
    `18th Man — Game Stats\nvs ${opponent} · ${date}\nFinal: Us ${ourScore} — ${theirScore} Them\n\nCarries: ${totalCarries} | Tackles: ${totalTackles} | Sets: ${h1Completed + h2Completed}/${setEvents.length}\n\n${reviewUrl}`,
  )

  function copyLink() {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(reviewUrl)
  }

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="grid grid-cols-3 text-center">
          <div className="py-4 border-r border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a] mb-1">Us</p>
            <p className="text-4xl font-bold text-white">{ourScore}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{tryEvents.length}T {conversionEvents.length}G</p>
          </div>
          <div className="py-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-600">—</span>
          </div>
          <div className="py-4 border-l border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Them</p>
            <p className="text-4xl font-bold text-zinc-300">{theirScore}</p>
          </div>
        </div>
      </div>

      {/* Carries */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a] mb-2">Attack — Carries</h2>
        {carriesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No carries recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {carriesByPlayer.map(p => {
                const pct = totalCarries > 0 ? Math.round((p.count / totalCarries) * 100) : 0
                return (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-200 flex-1">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.count}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${workloadColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Tackles */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">Defence — Tackles</h2>
        {tacklesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No tackles recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {tacklesByPlayer.map(p => {
                const pct = totalTackles > 0 ? Math.round((p.count / totalTackles) * 100) : 0
                return (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-200 flex-1">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.count}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${workloadColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Tries */}
      {triesByPlayer.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Tries Scored</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {triesByPlayer.map(p => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-200">{p.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">{p.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Set completion */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Set Completion</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">1st Half</p>
            <p className="text-2xl font-bold text-white">{h1Completed}/{h1Sets.length}</p>
            {h1Sets.length > 0 && <p className="text-xs text-zinc-500 mt-0.5">{Math.round((h1Completed / h1Sets.length) * 100)}%</p>}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">2nd Half</p>
            <p className="text-2xl font-bold text-white">{h2Completed}/{h2Sets.length}</p>
            {h2Sets.length > 0 && <p className="text-xs text-zinc-500 mt-0.5">{Math.round((h2Completed / h2Sets.length) * 100)}%</p>}
          </div>
        </div>
      </section>

      {/* Share */}
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
