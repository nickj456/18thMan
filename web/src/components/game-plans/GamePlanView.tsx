'use client'

import { Sparkles, Shield, Zap, ArrowRight, Target } from 'lucide-react'
import type { GamePlan, GamePlanAiPlan } from '@/lib/supabase/types'

interface GamePlanViewProps {
  gamePlan: GamePlan
  teamName?: string
}

function TeamLogo({ url, name }: { url: string | null; name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="h-16 w-16 rounded-xl object-contain bg-white/5"
      />
    )
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-700 text-lg font-bold text-zinc-300">
      {initials}
    </div>
  )
}

function SectionDivider() {
  return <hr className="border-zinc-800 my-6" />
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  intro?: string
  points: string[]
}

function Section({ icon, title, subtitle, intro, points }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#e8560a]">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          {title}
        </h3>
      </div>

      {subtitle && (
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
          {subtitle}
        </p>
      )}

      {intro && (
        <p className="text-sm text-zinc-300 leading-relaxed">{intro}</p>
      )}

      {points.length > 0 && (
        <ul className="space-y-1.5">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8560a]" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatKickOff(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function GamePlanView({ gamePlan, teamName = 'Your Team' }: GamePlanViewProps) {
  if (!gamePlan.ai_plan) {
    return (
      <div
        id="game-plan-view"
        className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center space-y-3"
      >
        <Sparkles className="size-8 text-zinc-600" />
        <p className="text-sm text-zinc-400 max-w-xs">
          No game plan generated yet. Fill in your tactical notes and click Generate.
        </p>
      </div>
    )
  }

  const plan: GamePlanAiPlan = gamePlan.ai_plan

  const locationLine = [gamePlan.pitch, formatKickOff(gamePlan.kick_off_time)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      id="game-plan-view"
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-0 print:bg-white print:border-transparent print:text-black"
    >
      {/* Match header */}
      <div className="flex flex-col items-center gap-4 pb-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <TeamLogo url={gamePlan.home_logo_url} name={teamName} />
            <span className="text-xs font-medium text-zinc-300 text-center max-w-[100px] leading-tight">
              {teamName}
            </span>
          </div>

          <span className="text-xl font-bold text-zinc-500">vs</span>

          <div className="flex flex-col items-center gap-2">
            <TeamLogo url={gamePlan.away_logo_url} name={gamePlan.opposition} />
            <span className="text-xs font-medium text-zinc-300 text-center max-w-[100px] leading-tight">
              {gamePlan.opposition}
            </span>
          </div>
        </div>

        {locationLine && (
          <p className="text-xs text-zinc-500">{locationLine}</p>
        )}
      </div>

      <SectionDivider />

      {/* Team Focus */}
      <Section
        icon={<Target className="size-4" />}
        title="Team Focus"
        intro={plan.teamFocus.intro}
        points={plan.teamFocus.keyMessages}
      />

      <SectionDivider />

      {/* Forwards */}
      <Section
        icon={<Shield className="size-4" />}
        title="Forwards (8 to 13)"
        subtitle={[plan.forwards.positions, plan.forwards.role].filter(Boolean).join(' — ')}
        points={plan.forwards.points}
      />

      <SectionDivider />

      {/* Backs */}
      <Section
        icon={<Zap className="size-4" />}
        title="Backs (1 to 5)"
        subtitle={[plan.backs.positions, plan.backs.role].filter(Boolean).join(' — ')}
        points={plan.backs.points}
      />

      <SectionDivider />

      {/* Half Backs */}
      <Section
        icon={<ArrowRight className="size-4" />}
        title="Half Backs (6 and 7)"
        subtitle={[plan.halfBacks.positions, plan.halfBacks.role].filter(Boolean).join(' — ')}
        points={plan.halfBacks.points}
      />

      <SectionDivider />

      {/* Final Reminders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[#e8560a]">
            <Sparkles className="size-4" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Final Reminders
          </h3>
        </div>

        {plan.finalReminders.closing && (
          <p className="text-sm text-zinc-300 leading-relaxed">
            {plan.finalReminders.closing}
          </p>
        )}

        {plan.finalReminders.points.length > 0 && (
          <ul className="space-y-1.5">
            {plan.finalReminders.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8560a]" />
                {point}
              </li>
            ))}
          </ul>
        )}

        {plan.finalReminders.quote && (
          <blockquote className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 italic text-center text-zinc-300">
            &ldquo;{plan.finalReminders.quote}&rdquo;
          </blockquote>
        )}
      </div>
    </div>
  )
}
