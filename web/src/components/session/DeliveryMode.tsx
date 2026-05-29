'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight, X, Play, Pause, RotateCcw,
  Clock, Users, Zap, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionSummary } from '@/app/(app)/sessions/actions'

export interface DeliveryItem {
  type: 'drill' | 'custom'
  title: string
  customType?: string | null
  description: string | null
  imageUrl: string | null
  difficulty: string | null
  playerCount: number | null
  ageGroup: string | null
  coachingPoints: string[]
  durationMinutes: number
  notes: string | null
}

interface Props {
  sessionTitle: string
  sessionId: string
  items: DeliveryItem[]
  aiSummary: SessionSummary | null
}

const CUSTOM_TYPE_COLORS: Record<string, string> = {
  'Team Talk':   'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'Game Plan':   'bg-amber-500/20  text-amber-300  border-amber-500/30',
  'Warm Up':     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Video Review':'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'Conditioning':'bg-red-500/20    text-red-300    border-red-500/30',
  'Positional':  'bg-sky-500/20    text-sky-300    border-sky-500/30',
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function DeliveryMode({ sessionTitle, sessionId, items, aiSummary }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState((items[0]?.durationMinutes ?? 0) * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [notesOpen, setNotesOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const current = items[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === items.length - 1
  const progress = ((currentIndex) / items.length) * 100

  // Drill timer — store interval ID in local const to avoid stale ref in updater
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!timerRunning) return

    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          setTimerRunning(false)
          setTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    intervalRef.current = id

    return () => clearInterval(id)
  }, [timerRunning])

  // Session elapsed timer — starts on mount
  useEffect(() => {
    sessionIntervalRef.current = setInterval(() => {
      setSessionElapsed((prev) => prev + 1)
    }, 1000)
    return () => { if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current) }
  }, [])

  const resetTimer = useCallback(() => {
    setTimerRunning(false)
    setTimerExpired(false)
    setTimerSeconds(current.durationMinutes * 60)
  }, [current.durationMinutes])

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index)
    setTimerRunning(false)
    setTimerExpired(false)
    setTimerSeconds(items[index].durationMinutes * 60)
    setNotesOpen(false)
  }, [items])

  const goPrev = useCallback(() => { if (!isFirst) goTo(currentIndex - 1) }, [isFirst, currentIndex, goTo])
  const goNext = useCallback(() => { if (!isLast) goTo(currentIndex + 1) }, [isLast, currentIndex, goTo])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev()
      if (e.key === ' ') { e.preventDefault(); setTimerRunning((r) => timerExpired ? r : !r) }
      if (e.key === 'Escape') { if (window.confirm('Exit delivery mode?')) router.push(`/sessions/${sessionId}`) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, router, sessionId, timerExpired])

  const timerPct = current.durationMinutes > 0
    ? (timerSeconds / (current.durationMinutes * 60)) * 100
    : 100

  const customColor = current.type === 'custom' && current.customType
    ? CUSTOM_TYPE_COLORS[current.customType] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
    : null

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (window.confirm('Exit delivery mode?')) router.push(`/sessions/${sessionId}`) }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Exit delivery mode (Esc)"
          >
            <X size={16} />
          </button>
          <span className="text-sm font-medium text-zinc-300 truncate max-w-48 sm:max-w-72">{sessionTitle}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span className="font-mono">{formatElapsed(sessionElapsed)}</span>
          <span className="text-xs">{currentIndex + 1} / {items.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800 shrink-0">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — drill list */}
        <div className="hidden md:flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 overflow-y-auto">
          <div className="p-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Session plan</div>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors border-l-2',
                i === currentIndex
                  ? 'border-orange-500 bg-zinc-800 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 w-4 shrink-0">{i + 1}</span>
                <span className="truncate leading-snug">{item.title}</span>
              </div>
              <div className="ml-6 mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600">
                <Clock size={9} />
                {item.durationMinutes}min
              </div>
            </button>
          ))}
        </div>

        {/* Drill content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-y-auto">
            <div className="flex-1 p-4 sm:p-8 max-w-3xl mx-auto w-full space-y-5">
              {/* Drill header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {current.type === 'custom' && current.customType && (
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium', customColor)}>
                      {current.customType}
                    </span>
                  )}
                  {current.difficulty && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {current.difficulty}
                    </span>
                  )}
                  {current.playerCount && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                      <Users size={9} />
                      {current.playerCount}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{current.title}</h1>
              </div>

              {/* Canvas image */}
              {current.imageUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <Image
                    src={current.imageUrl}
                    alt={current.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              )}

              {/* Coaching points */}
              {current.coachingPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
                    <Zap size={11} />
                    Coaching points
                  </div>
                  <ul className="space-y-2">
                    {current.coachingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
                        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Description */}
              {current.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">{current.description}</p>
              )}

              {/* Notes (collapsible) */}
              {current.notes && (
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setNotesOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} />
                      Coach notes
                    </span>
                    {notesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {notesOpen && (
                    <div className="px-4 pb-4 pt-1 text-sm text-zinc-300 italic border-t border-zinc-800">
                      {current.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-4">
              {/* Prev */}
              <button
                onClick={goPrev}
                disabled={isFirst}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Timer */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                {/* Timer bar */}
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000',
                      timerExpired ? 'bg-red-500' : timerPct < 25 ? 'bg-amber-500' : 'bg-orange-500'
                    )}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn(
                    'font-mono text-xl tabular-nums font-semibold',
                    timerExpired ? 'text-red-400' : timerPct < 25 ? 'text-amber-400' : 'text-white'
                  )}>
                    {formatTime(timerSeconds)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTimerRunning((r) => !r)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                      title="Play/Pause (Space)"
                    >
                      {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      title="Reset timer"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-600">{current.durationMinutes} min allocated</span>
              </div>

              {/* Next */}
              <button
                onClick={goNext}
                disabled={isLast}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
