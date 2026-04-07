import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, BookOpen, Users } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Session Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mySessions.length} session{mySessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/sessions/new" />}>
          <Plus className="size-4 mr-2" />
          New session
        </Button>
      </div>

      {mySessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-medium">No sessions yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Build your first training session from the drill library
          </p>
          <Button nativeButton={false} render={<Link href="/sessions/new" />}>
            <Plus size={15} className="mr-2" />
            Create session
          </Button>
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
