import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, Sparkles, CheckCircle, Clock, ListChecks,
  Swords, HelpCircle, Trophy, BookOpen, RotateCcw,
} from 'lucide-react'
import { GenerateSuggestionButton } from './GenerateSuggestionButton'
import { MarkUsedButton } from './MarkUsedButton'
import type { GameSenseSuggestion, GroupTrainingHistory } from '@/lib/supabase/types'

export const metadata = { title: 'AI Guidance — 18th Man' }

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

function SuggestionView({ item }: { item: GroupTrainingHistory }) {
  const s = item.suggestion as GameSenseSuggestion
  const catClass = categoryColour[s.category] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${catClass}`}>
                {s.category}
              </span>
              {item.used && (
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle size={10} /> Used
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{s.focus_area}</h2>
            <p className="text-sm text-zinc-400 mt-1">{s.rationale}</p>
          </div>
          {!item.used && (
            <MarkUsedButton historyId={item.id} groupId={item.group_id} />
          )}
        </div>
        <p className="text-xs text-zinc-600">
          Generated {new Date(item.suggested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Session plan */}
      <div className="space-y-4">
        {/* Warm-up */}
        <SectionCard icon={Clock} label={`Warm-Up — ${s.warm_up.duration}`}>
          <p className="font-medium text-white">{s.warm_up.title}</p>
          <p>{s.warm_up.description}</p>
          <p className="text-zinc-500 text-xs mt-1">Setup: {s.warm_up.setup}</p>
        </SectionCard>

        {/* Modified Game 1 */}
        <SectionCard icon={Swords} label={`Modified Game 1 — ${s.modified_game_1.duration}`}>
          <p className="font-medium text-white">{s.modified_game_1.title}</p>
          <p className="text-zinc-500 text-xs">Setup: {s.modified_game_1.setup}</p>
          <div className="mt-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs font-medium text-amber-400 mb-0.5">Constraint</p>
            <p className="text-xs text-zinc-300">{s.modified_game_1.constraint}</p>
          </div>
          <div className="mt-2">
            <p className="text-xs font-medium text-zinc-500 mb-0.5">Coaching focus</p>
            <p className="text-xs text-zinc-400">{s.modified_game_1.coaching_focus}</p>
          </div>
        </SectionCard>

        {/* Reflect questions */}
        <SectionCard icon={HelpCircle} label="Question & Reflect — 2–3 min">
          <ul className="space-y-1.5">
            {s.reflect_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-300">
                <span className="text-[#e8560a] font-bold shrink-0 mt-0.5">Q:</span>
                <span className="italic">&ldquo;{q}&rdquo;</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Modified Game 2 */}
        <SectionCard icon={Swords} label={`Modified Game 2 — ${s.modified_game_2.duration}`}>
          <p className="font-medium text-white">{s.modified_game_2.title}</p>
          <p className="text-zinc-500 text-xs">Setup: {s.modified_game_2.setup}</p>
          <div className="mt-2 p-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
            <p className="text-xs font-medium text-indigo-400 mb-0.5">Progression</p>
            <p className="text-xs text-zinc-300">{s.modified_game_2.progression}</p>
          </div>
        </SectionCard>

        {/* Competition */}
        <SectionCard icon={Trophy} label={`Game Sense Competition — ${s.competition.duration}`}>
          <p className="font-medium text-white">{s.competition.title}</p>
          <p className="text-zinc-500 text-xs">Setup: {s.competition.setup}</p>
          <div className="mt-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs font-medium text-emerald-400 mb-0.5">Scoring condition</p>
            <p className="text-xs text-zinc-300">{s.competition.scoring_condition}</p>
          </div>
        </SectionCard>

        {/* Review */}
        <SectionCard icon={BookOpen} label="Review — 3–5 min">
          <ul className="space-y-1.5">
            {s.review_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-zinc-300">
                <span className="text-zinc-600 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                {point}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}

export default async function AiGuidancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: membership } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single()

  if (!membership) redirect(`/groups/${id}`)

  // Latest suggestion (newest first)
  const { data: history } = await supabase
    .from('group_training_history')
    .select('*')
    .eq('group_id', id)
    .order('suggested_at', { ascending: false })
    .limit(10)

  const latest = history?.[0] ?? null
  const past = history?.slice(1) ?? []
  const canGenerate = profile.role !== 'viewer'

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href={`/groups/${id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> {group.name}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
            <Sparkles size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">AI Session Guidance</h1>
            <p className="text-sm text-zinc-500 mt-0.5">GameSense rotation for {group.name}</p>
          </div>
        </div>
        {canGenerate && <GenerateSuggestionButton groupId={id} />}
      </div>

      {/* Rotation progress */}
      {history && history.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <RotateCcw size={11} /> Rotation Progress
          </p>
          <p className="text-xs text-zinc-400">
            <span className="text-white font-medium">{history.filter(h => h.used).length}</span> of 15 focus areas used
            {history.filter(h => h.used).length === 15 && ' — full rotation complete, restarting'}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {history.filter(h => h.used).map(h => (
              <span key={h.id} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                {h.focus_area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Latest suggestion */}
      {latest ? (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={11} className="text-[#e8560a]" />
            {latest.used ? 'Last Suggestion' : 'Current Suggestion'}
          </h2>
          <SuggestionView item={latest as GroupTrainingHistory} />
        </section>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 rounded-xl border border-zinc-800 text-center">
          <Sparkles size={32} className="text-zinc-700" />
          <div>
            <p className="text-sm text-zinc-400 font-medium">No suggestions yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Generate your first GameSense session plan — the AI will track your focus area rotation automatically.
            </p>
          </div>
          {canGenerate && <GenerateSuggestionButton groupId={id} />}
        </div>
      )}

      {/* Past suggestions */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <ListChecks size={11} /> History
          </h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {past.map(h => {
                const catClass = categoryColour[h.category] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                return (
                  <li key={h.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${catClass}`}>
                        {h.category}
                      </span>
                      <p className="text-sm text-zinc-300 font-medium truncate">{h.focus_area}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-600">
                        {new Date(h.suggested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {h.used
                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle size={10} /> Used</span>
                        : <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Clock size={10} /> Pending</span>
                      }
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
