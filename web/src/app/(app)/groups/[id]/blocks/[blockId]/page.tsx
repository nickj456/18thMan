import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, LayoutList, Sparkles, CheckCircle, Clock, CalendarDays,
  ArrowRightLeft, Shield, ChevronRight,
} from 'lucide-react'
import { SwapSessionsButton } from './SwapSessionsButton'
import { CompleteSessionButton } from './CompleteSessionButton'
import { ArchiveBlockButton } from './ArchiveBlockButton'
import { DeleteBlockButton } from './DeleteBlockButton'
import { DeleteSessionButton } from './DeleteSessionButton'
import type { CoachingBlock, BlockSession } from '@/lib/supabase/types'

export const metadata = { title: 'Coaching Block — 18th Man' }

const categoryColour: Record<string, string> = {
  'Attack': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'Defence': 'bg-red-500/10 border-red-500/20 text-red-400',
  'Completions & Game Management': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'Skills in Context': 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
}

const statusConfig = {
  planned:   { label: 'Planned',   colour: 'text-zinc-500',   bg: 'bg-zinc-800/60',          icon: Clock },
  prepared:  { label: 'Ready',     colour: 'text-indigo-400', bg: 'bg-indigo-500/10',        icon: CalendarDays },
  completed: { label: 'Done',      colour: 'text-emerald-400',bg: 'bg-emerald-500/10',       icon: CheckCircle },
}

export default async function BlockOverviewPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string }>
}) {
  const { id: groupId, blockId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', groupId)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  // Verify membership
  const { data: membership } = await supabase
    .from('group_invitations')
    .select('id, group_role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!membership && profile.role !== 'admin') redirect(`/groups/${groupId}`)

  const { data: block } = await supabase
    .from('coaching_blocks')
    .select('*')
    .eq('id', blockId)
    .eq('group_id', groupId)
    .single()

  if (!block) notFound()

  const { data: sessions } = await supabase
    .from('block_sessions')
    .select('*')
    .eq('block_id', blockId)
    .order('session_number')

  const blockData = block as CoachingBlock
  const sessionList = (sessions ?? []) as BlockSession[]

  const isGroupAdmin = (membership as { group_role?: string | null } | null)?.group_role === 'admin'
  const isClubAdmin = profile.club_role === 'admin' || profile.role === 'admin' || isGroupAdmin
  const completed = sessionList.filter(s => s.status === 'completed').length
  const progress = sessionList.length > 0 ? Math.round((completed / sessionList.length) * 100) : 0

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href={`/groups/${groupId}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> {group.name}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
            <LayoutList size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="app-heading text-2xl">{blockData.name}</h1>
              {blockData.status === 'completed' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Complete</span>
              )}
              {blockData.status === 'archived' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">Archived</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">{sessionList.length} sessions · {group.name}</p>
          </div>
        </div>
        {isClubAdmin && (
          <div className="flex items-center gap-2">
            {blockData.status === 'active' && (
              <ArchiveBlockButton blockId={blockId} groupId={groupId} blockName={blockData.name} />
            )}
            <DeleteBlockButton blockId={blockId} groupId={groupId} blockName={blockData.name} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{completed} of {sessionList.length} sessions complete</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#e8560a] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Category coverage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {['Attack', 'Defence', 'Completions & Game Management', 'Skills in Context'].map(cat => {
          const total = sessionList.filter(s => s.category === cat).length
          const done = sessionList.filter(s => s.category === cat && s.status === 'completed').length
          const catClass = categoryColour[cat] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'
          const shortLabel = cat === 'Completions & Game Management' ? 'Completions' : cat
          return (
            <div key={cat} className={`p-3 rounded-xl border ${catClass} space-y-0.5`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{shortLabel}</p>
              <p className="text-xl font-bold">{done}<span className="text-sm font-normal opacity-60">/{total}</span></p>
            </div>
          )
        })}
      </div>

      {/* Session timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Session Plan</h2>
          {isClubAdmin && blockData.status === 'active' && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <ArrowRightLeft size={11} /> Tap a session to prepare · drag to swap
            </div>
          )}
        </div>

        <div className="space-y-2">
          {sessionList.map(session => {
            const sc = statusConfig[session.status]
            const StatusIcon = sc.icon
            const catClass = categoryColour[session.category] ?? 'bg-zinc-800 border-zinc-700 text-zinc-400'
            const canAct = isClubAdmin && blockData.status === 'active'

            return (
              <div key={session.id} className={`rounded-xl border border-zinc-800 ${sc.bg} overflow-hidden`}>
                <div className="flex items-center gap-4 px-4 py-3.5">
                  {/* Session number */}
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-xs font-mono text-zinc-400">{session.session_number}</span>
                  </div>

                  {/* Focus area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-zinc-200">{session.focus_area}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catClass}`}>
                        {session.category === 'Completions & Game Management' ? 'Completions' : session.category}
                      </span>
                    </div>
                    {session.scheduled_date && (
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                        <CalendarDays size={10} />
                        {new Date(session.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {session.notes && (
                      <p className="text-xs text-zinc-600 mt-0.5 italic truncate">{session.notes}</p>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1 text-[11px] font-medium ${sc.colour}`}>
                      <StatusIcon size={11} /> {sc.label}
                    </span>

                    {session.status !== 'completed' && (
                      <Link
                        href={`/groups/${groupId}/blocks/${blockId}/session/${session.session_number}`}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        {canAct ? (session.status === 'planned' ? 'Prepare' : 'Edit') : 'View'} <ChevronRight size={12} />
                      </Link>
                    )}

                    {canAct && session.status === 'prepared' && (
                      <CompleteSessionButton
                        blockSessionId={session.id}
                        groupId={groupId}
                        sessionNumber={session.session_number}
                      />
                    )}

                    {session.status === 'completed' && (
                      <Link
                        href={`/groups/${groupId}/blocks/${blockId}/session/${session.session_number}`}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        <CheckCircle size={11} className="text-emerald-400" /> View <ChevronRight size={12} />
                      </Link>
                    )}

                    {isClubAdmin && (
                      <DeleteSessionButton
                        blockSessionId={session.id}
                        groupId={groupId}
                        sessionNumber={session.session_number}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Swap helper — only for admins with active block */}
      {isClubAdmin && blockData.status === 'active' && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowRightLeft size={11} /> Swap Sessions
          </h2>
          <p className="text-xs text-zinc-600">
            Team struggled on the weekend? Move a focus area earlier in the block — coverage stays intact, just reordered.
          </p>
          <SwapSessionsButton
            blockId={blockId}
            groupId={groupId}
            sessions={sessionList.filter(s => s.status !== 'completed').map(s => ({
              id: s.id,
              session_number: s.session_number,
              focus_area: s.focus_area,
              category: s.category,
            }))}
          />
        </section>
      )}

      {/* Admin badge */}
      {isClubAdmin && (
        <p className="text-[10px] text-zinc-700 flex items-center gap-1">
          <Shield size={9} /> You can manage this block as club admin
        </p>
      )}
    </div>
  )
}
