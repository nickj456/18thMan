'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, PenTool, BookOpen, Users, HelpCircle, X, ChevronRight } from 'lucide-react'

interface Step {
  id: string
  icon: React.ElementType
  title: string
  description: string
  href: string
  cta: string
  done: boolean
  colour: string
}

interface OnboardingChecklistProps {
  drillCount: number
  hasClub: boolean
  hasSession: boolean
}

export function OnboardingChecklist({ drillCount, hasClub, hasSession }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false)

  const steps: Step[] = [
    {
      id: 'drill',
      icon: PenTool,
      title: 'Create your first drill',
      description: 'Use the visual designer to draw up a drill on a pitch canvas.',
      href: '/drills/new',
      cta: 'Open designer',
      done: drillCount > 0,
      colour: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'session',
      icon: BookOpen,
      title: 'Plan a training session',
      description: 'Build a session plan by adding drills, durations, and coaching notes.',
      href: '/sessions/new',
      cta: 'New session',
      done: hasSession,
      colour: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'club',
      icon: Users,
      title: 'Join or create a club',
      description: 'Connect with your coaching staff to share drills and sessions.',
      href: '/clubs',
      cta: 'Find your club',
      done: hasClub,
      colour: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
  ]

  const completedCount = steps.filter(s => s.done).length

  if (dismissed || completedCount === steps.length) return null

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-colors ${s.done ? 'bg-emerald-400' : i === completedCount ? 'bg-orange-400' : 'bg-zinc-700'}`}
              />
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Get started with 18th Man</p>
            <p className="text-xs text-zinc-500 mt-0.5">{completedCount} of {steps.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/how-to" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
            <HelpCircle size={12} />
            How it works
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-zinc-800/60">
        {steps.map(step => {
          const Icon = step.icon
          return (
            <div key={step.id} className={`flex items-center gap-4 px-5 py-4 ${step.done ? 'opacity-50' : ''}`}>
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${step.colour}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {step.done
                    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    : <Circle size={13} className="text-zinc-600 shrink-0" />
                  }
                  <p className={`text-sm font-medium ${step.done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {step.title}
                  </p>
                </div>
                {!step.done && (
                  <p className="text-xs text-zinc-500 mt-0.5 ml-[21px]">{step.description}</p>
                )}
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  {step.cta}
                  <ChevronRight size={12} />
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
