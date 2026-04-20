import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, Calendar, MapPin, Star, MessageSquare,
  ShieldAlert, AlertCircle, CheckCircle2, ClipboardList,
} from 'lucide-react'
import { AddNoteForm } from './AddNoteForm'
import { DeleteNoteButton } from './DeleteNoteButton'
import { MatchRatingForm, SessionRatingForm } from './RatingForm'
import { PlayerStatusToggle } from '../PlayerStatusToggle'
import type { Player, Match } from '@/lib/supabase/types'

export const metadata = { title: 'Player — 18th Man' }

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
        />
      ))}
    </div>
  )
}

const RESULT_BADGE = {
  win: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  loss: 'text-red-400 bg-red-500/10 border-red-500/20',
  draw: 'text-zinc-400 bg-zinc-700/40 border-zinc-600/30',
}

const STATUS_ICON = {
  available: <CheckCircle2 size={14} className="text-emerald-400" />,
  injured: <ShieldAlert size={14} className="text-red-400" />,
  unavailable: <AlertCircle size={14} className="text-zinc-500" />,
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string; playerId: string }>
}) {
  const { id: groupId, playerId } = await params
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
    .eq('id', groupId)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('group_id', groupId)
    .single() as { data: Player | null }

  if (!player) redirect(`/groups/${groupId}/squad`)

  const canManage = profile.role === 'coach' || profile.role === 'admin'

  const [notesRes, matchesRes, sessionPlansRes, matchRatingsRes, sessionRatingsRes] = await Promise.all([
    supabase
      .from('player_notes')
      .select('id, note, created_at, created_by, profiles!player_notes_created_by_fkey(display_name, username)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('matches')
      .select('id, opponent, match_date, location, result, our_score, opponent_score')
      .eq('group_id', groupId)
      .order('match_date', { ascending: false })
      .limit(20),
    supabase
      .from('session_plans')
      .select('id, title, scheduled_at')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from('player_match_ratings')
      .select('match_id, rating, notes')
      .eq('player_id', playerId),
    supabase
      .from('player_session_ratings')
      .select('session_plan_id, attended, rating, notes')
      .eq('player_id', playerId),
  ])

  const notes = notesRes.data ?? []
  const matches = (matchesRes.data ?? []) as Pick<Match, 'id' | 'opponent' | 'match_date' | 'location' | 'result' | 'our_score' | 'opponent_score'>[]
  const sessionPlans = sessionPlansRes.data ?? []
  const matchRatingMap = Object.fromEntries(
    (matchRatingsRes.data ?? []).map(r => [r.match_id, r]),
  )
  const sessionRatingMap = Object.fromEntries(
    (sessionRatingsRes.data ?? []).map(r => [r.session_plan_id, r]),
  )

  const age = player.dob
    ? new Date().getFullYear() - new Date(player.dob).getFullYear()
    : null

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href={`/groups/${groupId}/squad`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Squad
      </Link>

      {/* Player header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl font-bold text-indigo-400">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="app-heading text-2xl">{player.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {STATUS_ICON[player.status]}
              <span className="text-xs text-zinc-500 capitalize">{player.status}</span>
              {age && <span className="text-xs text-zinc-600">· age {age}</span>}
              {player.positions?.length > 0 && (
                <span className="text-xs text-zinc-500">· {player.positions.join(', ')}</span>
              )}
            </div>
          </div>
        </div>
        {canManage && (
          <PlayerStatusToggle groupId={groupId} playerId={playerId} current={player.status} />
        )}
      </div>

      {/* Coaching Notes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare size={12} /> Coaching Notes
        </h2>

        {canManage && <AddNoteForm groupId={groupId} playerId={playerId} />}

        {notes.length === 0 ? (
          <p className="text-sm text-zinc-600">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(n => {
              const author = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
              const authorName = (author as { display_name: string | null; username: string } | null)
              const date = new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const isOwn = n.created_by === user.id
              return (
                <div key={n.id} className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">
                      {authorName?.display_name ?? authorName?.username} · {date}
                    </span>
                    {(isOwn || profile.role === 'admin') && canManage && (
                      <DeleteNoteButton groupId={groupId} playerId={playerId} noteId={n.id} />
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{n.note}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Session Ratings */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <ClipboardList size={12} className="text-indigo-400" /> Session Ratings
        </h2>
        {sessionPlans.length === 0 ? (
          <p className="text-sm text-zinc-600">No sessions for this group yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {sessionPlans.map(s => {
                const existing = sessionRatingMap[s.id]
                const date = s.scheduled_at
                  ? new Date(s.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : null
                return (
                  <li key={s.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 flex-1 truncate">{s.title}</p>
                      {date && <span className="text-xs text-zinc-600 shrink-0">{date}</span>}
                      {existing?.rating && <StarDisplay rating={existing.rating} />}
                      {existing && !existing.attended && (
                        <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full">Absent</span>
                      )}
                    </div>
                    {canManage && (
                      <SessionRatingForm
                        groupId={groupId}
                        playerId={playerId}
                        sessionPlanId={s.id}
                        existing={existing}
                      />
                    )}
                    {existing?.notes && !canManage && (
                      <p className="text-xs text-zinc-500 italic">{existing.notes}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Match Ratings */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Star size={12} className="text-amber-400" /> Match Ratings
        </h2>
        {matches.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No matches recorded.{' '}
            <Link href={`/groups/${groupId}/squad`} className="text-indigo-400 hover:text-indigo-300">
              Add a match from the squad page.
            </Link>
          </p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {matches.map(m => {
                const existing = matchRatingMap[m.id]
                const date = new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                const score = m.our_score !== null && m.opponent_score !== null
                  ? `${m.our_score}–${m.opponent_score}`
                  : null
                return (
                  <li key={m.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-zinc-200 flex-1 truncate">
                        vs {m.opponent}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Calendar size={10} /> {date}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500 capitalize">
                          <MapPin size={10} /> {m.location}
                        </span>
                        {score && m.result && (
                          <span className={`text-[10px] border px-1.5 py-0.5 rounded-full uppercase font-semibold ${RESULT_BADGE[m.result]}`}>
                            {m.result} {score}
                          </span>
                        )}
                      </div>
                      {existing?.rating && <StarDisplay rating={existing.rating} />}
                    </div>
                    {canManage && (
                      <MatchRatingForm
                        groupId={groupId}
                        playerId={playerId}
                        matchId={m.id}
                        existing={existing}
                      />
                    )}
                    {existing?.notes && !canManage && (
                      <p className="text-xs text-zinc-500 italic">{existing.notes}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
