import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, Clock, Swords, HelpCircle, Trophy, BookOpen,
  CalendarDays, Lightbulb, CheckCircle,
} from 'lucide-react'
import { PrepareSessionForm } from './PrepareSessionForm'
import type { BlockSession, BlockSessionPlan } from '@/lib/supabase/types'

export const metadata = { title: 'Prepare Session — 18th Man' }

const categoryColour: Record<string, string> = {
  'Attack': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'Defence': 'bg-red-500/10 border-red-500/20 text-red-400',
  'Completions & Game Management': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'Skills in Context': 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
}

function SectionCard({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        <Icon size={12} className="text-zinc-500" /> {label}
      </h3>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-2 text-sm text-zinc-300">
        {children}
      </div>
    </div>
  )
}

export default async function PrepareSessionPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string; sessionNumber: string }>
}) {
  const { id: groupId, blockId, sessionNumber: sessionNumberStr } = await params
  const sessionNumber = parseInt(sessionNumberStr, 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const isClubAdmin = profile.club_role === 'admin' || profile.role === 'admin'

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', groupId)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  // Must be a group member or club admin to view
  if (!isClubAdmin) {
    const { data: membership } = await supabase
      .from('group_invitations')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!membership) redirect(`/groups/${groupId}`)
  }

  const { data: block } = await supabase
    .from('coaching_blocks')
    .select('id, name, total_sessions, status')
    .eq('id', blockId)
    .eq('group_id', groupId)
    .single()

  if (!block) notFound()
  if (block.status !== 'active') redirect(`/groups/${groupId}/blocks/${blockId}`)

  const { data: session } = await supabase
    .from('block_sessions')
    .select('*')
    .eq('block_id', blockId)
    .eq('session_number', sessionNumber)
    .single()

  if (!session) notFound()

  const bs = session as BlockSession
  const plan = bs.ai_plan as BlockSessionPlan | null

  const catClass = categoryColour[bs.category] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/groups/${groupId}/blocks/${blockId}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> {block.name}
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-600 font-mono">Session {bs.session_number} of {block.total_sessions}</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${catClass}`}>
            {bs.category}
          </span>
          {bs.status === 'completed' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle size={11} /> Completed
            </span>
          )}
        </div>
        <h1 className="app-heading text-2xl">{bs.focus_area}</h1>
      </div>

      {/* Preparation form — admins only */}
      {isClubAdmin ? (
        <PrepareSessionForm
          blockSessionId={bs.id}
          groupId={groupId}
          blockId={blockId}
          initialDate={bs.scheduled_date}
          initialNotes={bs.notes}
          status={bs.status}
        />
      ) : (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          {bs.scheduled_date && (
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CalendarDays size={12} /> {new Date(bs.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {bs.notes && (
            <p className="text-sm text-zinc-300 italic">{bs.notes}</p>
          )}
          {!bs.scheduled_date && !bs.notes && (
            <p className="text-xs text-zinc-600">No date or notes set yet.</p>
          )}
        </div>
      )}

      {/* AI Session Plan */}
      {plan ? (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Lightbulb size={11} className="text-[#e8560a]" /> AI Session Plan
          </h2>

          <SectionCard icon={Clock} label={`Warm-Up — ${plan.warm_up.duration}`}>
            <p className="font-medium text-white">{plan.warm_up.title}</p>
            <p>{plan.warm_up.description}</p>
            <p className="text-zinc-500 text-xs mt-1">Setup: {plan.warm_up.setup}</p>
          </SectionCard>

          <SectionCard icon={Swords} label={`Modified Game 1 — ${plan.modified_game_1.duration}`}>
            <p className="font-medium text-white">{plan.modified_game_1.title}</p>
            <p className="text-zinc-500 text-xs">Setup: {plan.modified_game_1.setup}</p>
            <div className="mt-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Constraint</p>
              <p className="text-xs text-zinc-300">{plan.modified_game_1.constraint}</p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Coaching focus</p>
              <p className="text-xs text-zinc-400">{plan.modified_game_1.coaching_focus}</p>
            </div>
          </SectionCard>

          <SectionCard icon={HelpCircle} label="Question & Reflect — 2–3 min">
            <ul className="space-y-1.5">
              {plan.reflect_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-[#e8560a] font-bold shrink-0 mt-0.5">Q:</span>
                  <span className="italic">&ldquo;{q}&rdquo;</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard icon={Swords} label={`Modified Game 2 — ${plan.modified_game_2.duration}`}>
            <p className="font-medium text-white">{plan.modified_game_2.title}</p>
            <p className="text-zinc-500 text-xs">Setup: {plan.modified_game_2.setup}</p>
            <div className="mt-2 p-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
              <p className="text-xs font-medium text-indigo-400 mb-0.5">Progression</p>
              <p className="text-xs text-zinc-300">{plan.modified_game_2.progression}</p>
            </div>
          </SectionCard>

          <SectionCard icon={Trophy} label={`Game Sense Competition — ${plan.competition.duration}`}>
            <p className="font-medium text-white">{plan.competition.title}</p>
            <p className="text-zinc-500 text-xs">Setup: {plan.competition.setup}</p>
            <div className="mt-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-xs font-medium text-emerald-400 mb-0.5">Scoring condition</p>
              <p className="text-xs text-zinc-300">{plan.competition.scoring_condition}</p>
            </div>
          </SectionCard>

          <SectionCard icon={BookOpen} label="Review — 3–5 min">
            <ul className="space-y-1.5">
              {plan.review_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-zinc-600 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  {point}
                </li>
              ))}
            </ul>
          </SectionCard>

          {plan.coaching_tips && (
            <SectionCard icon={Lightbulb} label="Coaching Tips">
              <p className="text-zinc-300">{plan.coaching_tips}</p>
            </SectionCard>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-600 py-8 text-center">No AI plan generated for this session.</p>
      )}
    </div>
  )
}
