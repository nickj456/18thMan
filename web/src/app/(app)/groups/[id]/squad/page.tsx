import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users, ChevronRight, ShieldAlert, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AddPlayerForm } from './AddPlayerForm'
import { PlayerStatusToggle } from './PlayerStatusToggle'
import type { Player } from '@/lib/supabase/types'

export const metadata = { title: 'Squad — 18th Man' }

const STATUS_ICON = {
  available: <CheckCircle2 size={12} className="text-emerald-400" />,
  injured: <ShieldAlert size={12} className="text-red-400" />,
  unavailable: <AlertCircle size={12} className="text-zinc-500" />,
}

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: players } = await supabase
    .from('players')
    .select('id, name, positions, dob, status, created_at')
    .eq('group_id', id)
    .order('name') as { data: Player[] | null }

  const canManage = profile.role === 'coach' || profile.role === 'admin'

  const available = players?.filter(p => p.status === 'available') ?? []
  const injured = players?.filter(p => p.status === 'injured') ?? []
  const unavailable = players?.filter(p => p.status === 'unavailable') ?? []

  function PlayerRow({ player }: { player: Player }) {
    const age = player.dob
      ? new Date().getFullYear() - new Date(player.dob).getFullYear()
      : null
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors">
        <Link href={`/groups/${id}/squad/${player.id}`} className="flex-1 min-w-0 flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-xs font-medium text-indigo-400">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {STATUS_ICON[player.status]}
              <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{player.name}</p>
              {age && <span className="text-[10px] text-zinc-600 shrink-0">age {age}</span>}
            </div>
            {player.positions?.length > 0 && (
              <p className="text-xs text-zinc-500 truncate">{player.positions.join(' · ')}</p>
            )}
          </div>
        </Link>
        {canManage && (
          <PlayerStatusToggle groupId={id} playerId={player.id} current={player.status} />
        )}
        <Link href={`/groups/${id}/squad/${player.id}`} className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          <ChevronRight size={14} />
        </Link>
      </li>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href={`/groups/${id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> {group.name}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Users size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">Squad</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{players?.length ?? 0} players · {group.name}</p>
          </div>
        </div>
        {canManage && <AddPlayerForm groupId={id} />}
      </div>

      {!players?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Users size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No players yet.</p>
          {canManage && <p className="text-xs text-zinc-600">Click "Add Player" to build your squad.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {available.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-400" /> Available ({available.length})
              </h2>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <ul className="divide-y divide-zinc-800 bg-zinc-900">
                  {available.map(p => <PlayerRow key={p.id} player={p} />)}
                </ul>
              </div>
            </section>
          )}

          {injured.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={11} className="text-red-400" /> Injured ({injured.length})
              </h2>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <ul className="divide-y divide-zinc-800 bg-zinc-900">
                  {injured.map(p => <PlayerRow key={p.id} player={p} />)}
                </ul>
              </div>
            </section>
          )}

          {unavailable.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={11} className="text-zinc-500" /> Unavailable ({unavailable.length})
              </h2>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <ul className="divide-y divide-zinc-800 bg-zinc-900">
                  {unavailable.map(p => <PlayerRow key={p.id} player={p} />)}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
