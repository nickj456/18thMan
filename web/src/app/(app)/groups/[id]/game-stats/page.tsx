import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { GameStatSessionWithMatch } from '@/lib/supabase/types'

export const metadata = { title: 'Game Stats — 18th Man' }

export default async function GameStatsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ upgrade?: string }>
}) {
  const { id } = await params
  const { upgrade } = await searchParams
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

  const { data: sessions } = await supabase
    .from('game_stat_sessions')
    .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
    .eq('group_id', id)
    .order('created_at', { ascending: false }) as {
      data: GameStatSessionWithMatch[] | null
    }

  const canCreate = ['coach', 'admin'].includes(profile.role)

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> {group.name}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
            <Activity size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">Game Stats</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{group.name}</p>
          </div>
        </div>
        {canCreate && (
          <Link
            href={`/groups/${id}/game-stats/new`}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
          >
            <Plus size={14} /> New Session
          </Link>
        )}
      </div>

      {upgrade && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <p className="text-sm text-amber-300 font-medium">Upgrade required</p>
          <p className="text-xs text-amber-400/70 mt-1">
            Game Stats is available on the Club plan. Ask your club admin to upgrade.
          </p>
        </div>
      )}

      {!sessions?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Activity size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No stats sessions yet.</p>
          {canCreate && (
            <Link
              href={`/groups/${id}/game-stats/new`}
              className="text-xs text-[#e8560a] hover:text-[#d14d09] transition-colors"
            >
              Start tracking a match →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <ul className="divide-y divide-zinc-800 bg-zinc-900">
            {sessions.map(s => {
              const m = Array.isArray(s.match) ? s.match[0] : s.match
              const date = m
                ? new Date(m.match_date).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })
                : '—'
              return (
                <li key={s.id}>
                  <Link
                    href={`/groups/${id}/game-stats/${s.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-[#e8560a]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          vs {m?.opponent ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {date} · {m?.location === 'home' ? 'Home' : 'Away'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-zinc-600 group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
