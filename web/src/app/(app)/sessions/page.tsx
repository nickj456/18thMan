import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, BookOpen, Users, Lock, Sparkles } from 'lucide-react'
import { canCreateSession, FREE_SESSION_LIMIT } from '@/lib/subscription'
import type { SessionPlan } from '@/lib/supabase/types'

type SessionWithGroup = SessionPlan & {
  coaching_groups?: { name: string } | { name: string }[] | null
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ownResult, groupResult] = await Promise.all([
    supabase
      .from('session_plans')
      .select('*')
      .eq('coach_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('session_plans')
      .select('*, coaching_groups!session_plans_group_id_fkey(name)')
      .not('group_id', 'is', null)
      .neq('coach_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  // Deduplicate in case user is also the owner of a group session
  const ownIds = new Set((ownResult.data ?? []).map(s => s.id))
  const groupSessions = (groupResult.data ?? []).filter(s => !ownIds.has(s.id))
  const mySessions = [...(ownResult.data ?? []), ...groupSessions] as SessionWithGroup[]

  const { allowed: canCreate, tier, count: sessionCount } = await canCreateSession(supabase, user.id)
  const atLimit = !canCreate && tier === 'free'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Session Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mySessions.length} session{mySessions.length !== 1 ? 's' : ''}
            {tier === 'free' && (
              <span className="ml-2 text-zinc-600">
                · {sessionCount}/{FREE_SESSION_LIMIT} free sessions used
              </span>
            )}
          </p>
        </div>
        {atLimit ? (
          <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed">
            <Lock className="size-4 mr-2" />
            New session
          </Button>
        ) : (
          <Button size="sm" nativeButton={false} render={<Link href="/sessions/new" />}>
            <Plus className="size-4 mr-2" />
            New session
          </Button>
        )}
      </div>

      {atLimit && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-amber-300">
              You&apos;ve used all {FREE_SESSION_LIMIT} free session plans
            </p>
            <p className="text-xs text-zinc-400">
              Upgrade to a club subscription for unlimited sessions, PDF export, coaching groups, and more.
            </p>
          </div>
          <Link
            href="mailto:hello@18thman.app?subject=Club subscription"
            className="shrink-0 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg transition-colors text-center"
          >
            Upgrade your club
          </Link>
        </div>
      )}

      {!atLimit && sessionCount < FREE_SESSION_LIMIT && mySessions.length > 0 && (
        <Link
          href={`/chat/ai?prompt=${encodeURIComponent('Plan a 60 minute session for U14s, 12 players, focusing on handling. Give me a full timed run sheet with drills and coaching points.')}`}
          className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-colors"
        >
          <Sparkles size={16} className="text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-300">Generate a session with AI</p>
            <p className="text-xs text-zinc-500 mt-0.5">Describe what you need and get a full timed run sheet instantly</p>
          </div>
          <span className="text-xs text-indigo-400 shrink-0">Try it →</span>
        </Link>
      )}

      {mySessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
          <div>
            <div className="text-5xl mb-4">📋</div>
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Build from the drill library or let AI plan it for you
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button nativeButton={false} render={<Link href="/sessions/new" />} variant="outline">
              <Plus size={15} className="mr-2" />
              Build from scratch
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/chat/ai?prompt=${encodeURIComponent('Plan a 60 minute session for U14s, 12 players, focusing on handling. Give me a full timed run sheet with drills and coaching points.')}`} />}
            >
              <Sparkles size={15} className="mr-2" />
              Generate with AI
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {mySessions.map(session => {
            const drillCount = Array.isArray(session.drills_order) ? session.drills_order.length : 0
            const groupName = session.coaching_groups
              ? (Array.isArray(session.coaching_groups) ? session.coaching_groups[0]?.name : session.coaching_groups?.name) ?? null
              : null
            const hours = session.total_duration ? Math.floor(session.total_duration / 60) : 0
            const mins = session.total_duration ? session.total_duration % 60 : 0
            const durationLabel = session.total_duration
              ? hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
              : null

            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {session.title}
                  </h2>
                  {groupName && (
                    <Badge variant="outline" className="text-xs flex-shrink-0 border-indigo-500/40 text-indigo-400">
                      <Users size={10} className="mr-1" />
                      {groupName}
                    </Badge>
                  )}
                  {session.is_shared && !groupName && (
                    <Badge variant="outline" className="text-xs flex-shrink-0 border-indigo-500/40 text-indigo-400">
                      <Users size={10} className="mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} />
                    {drillCount} drill{drillCount !== 1 ? 's' : ''}
                  </span>
                  {durationLabel && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {durationLabel}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-600">
                  Updated {new Date(session.updated_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
