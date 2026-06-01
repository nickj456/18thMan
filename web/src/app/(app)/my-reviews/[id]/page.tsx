import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Star, MessageSquare, Users, Calendar, User, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DeleteReviewButton } from './DeleteReviewButton'

type Player = {
  id: string
  number: number
  name: string
  stats?: Record<string, unknown>
}

type Rating = {
  score: number
  feedback?: string
}

type Response = {
  id: string
  review_id: string
  responder: string
  ratings: Record<string, Rating>
  created_at: string
}

type MatchInfo = {
  date?: string
  venue?: string
  round?: string
}

// Converts a raw seconds value to a Veo deep-link: {base}/#t=MM:SS
function veoLink(veoUrl: string, seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const base = veoUrl.replace(/#.*$/, '').replace(/\/$/, '')
  return `${base}/#t=${mm}:${ss}`
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('squad_reviews')
    .select('club, opposition')
    .eq('id', id)
    .single()
  if (!data) return { title: 'Review — 18th Man' }
  return { title: `${data.club} vs ${data.opposition} — 18th Man` }
}

function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBadgeClass(score: number) {
  if (score >= 8) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 6) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [reviewResult, responsesResult, profileResult] = await Promise.all([
    supabase.from('squad_reviews').select('*').eq('id', id).single(),
    supabase
      .from('squad_review_responses')
      .select('*')
      .eq('review_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('role, club_id, club_role').eq('id', user.id).single(),
  ])

  if (!reviewResult.data) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Link
          href="/my-reviews"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={14} />
          All reviews
        </Link>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <MessageSquare size={32} className="text-zinc-700" />
          <p className="text-sm font-medium text-zinc-400">This review is no longer available.</p>
          <p className="text-xs text-zinc-600">It may have been deleted from the Match Analyst app.</p>
        </div>
      </div>
    )
  }

  const review = reviewResult.data
  const responses = (responsesResult.data ?? []) as Response[]
  const players = (review.players_data ?? []) as Player[]
  const matchInfo = review.match_info as MatchInfo | null
  const veoUrl = review.veo_url as string | null
  const profile = profileResult.data

  // Determine delete permission
  let canDelete = profile?.role === 'admin'
  if (!canDelete && review.group_id) {
    const [groupResult, inviteResult] = await Promise.all([
      supabase
        .from('coaching_groups')
        .select('created_by, club_id')
        .eq('id', review.group_id)
        .single(),
      supabase
        .from('group_invitations')
        .select('group_role')
        .eq('group_id', review.group_id)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle(),
    ])
    const group = groupResult.data
    if (group?.created_by === user.id) canDelete = true
    if (!canDelete && inviteResult.data?.group_role === 'admin') canDelete = true
    if (!canDelete && group && profile?.club_role === 'admin' && profile.club_id === group.club_id) canDelete = true
  }

  // Aggregate scores and feedback per player
  const playerStats = players.map(player => {
    const key = String(player.number)
    const scores = responses
      .map(r => r.ratings?.[key]?.score)
      .filter((s): s is number => typeof s === 'number' && s >= 1 && s <= 10)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const individualScores = responses
      .filter(r => typeof r.ratings?.[key]?.score === 'number')
      .map(r => ({ responder: r.responder, score: r.ratings[key].score }))
    const feedback = responses
      .filter(r => r.ratings?.[key]?.feedback?.trim())
      .map(r => ({ responder: r.responder, text: r.ratings[key].feedback!, date: r.created_at }))
    return { player, avg, individualScores, feedback }
  })

  // Sort: highest avg first, unrated last
  const sorted = [...playerStats].sort((a, b) => {
    if (a.avg === null && b.avg === null) return a.player.number - b.player.number
    if (a.avg === null) return 1
    if (b.avg === null) return -1
    return b.avg - a.avg
  })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/my-reviews"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={14} />
        All reviews
      </Link>

      {/* Veo video button */}
      {veoUrl && (
        <a
          href={veoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 hover:border-blue-500/50 hover:bg-blue-500/15 transition-colors"
        >
          <PlayCircle size={20} className="text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-300">Watch on Veo</p>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{veoUrl}</p>
          </div>
          <span className="text-xs text-blue-400 shrink-0">Open ↗</span>
        </a>
      )}

      {/* Match header card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="app-heading text-2xl">
              {review.club}{' '}
              <span className="text-zinc-500 font-normal">vs</span>{' '}
              {review.opposition}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-zinc-500">
              {matchInfo?.round && <span>{matchInfo.round}</span>}
              {matchInfo?.date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {new Date(matchInfo.date).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
              {matchInfo?.venue && <span>{matchInfo.venue}</span>}
              <span className="flex items-center gap-1.5">
                <User size={13} />
                Shared by {review.shared_by}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-sm py-1">
              <Users size={13} className="mr-1.5" />
              {responses.length} response{responses.length !== 1 ? 's' : ''}
            </Badge>
            {canDelete && (
              <DeleteReviewButton
                reviewId={review.id}
                label={`${review.club} vs ${review.opposition}`}
              />
            )}
          </div>
        </div>

        {/* Responders list */}
        {responses.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Responded
            </p>
            <div className="flex flex-wrap gap-2">
              {responses.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1"
                >
                  <span className="text-zinc-300">{r.responder}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-600">
                    {new Date(r.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No responses yet */}
      {responses.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border border-zinc-800 text-center">
          <MessageSquare size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No responses yet.</p>
          <p className="text-xs text-zinc-600">
            Share the review link and responses will appear here.
          </p>
        </div>
      )}

      {/* Player ratings */}
      {responses.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Player Ratings — {players.length} players
          </h2>

          <div className="space-y-3">
            {sorted.map(({ player, avg, individualScores, feedback }) => (
              <div
                key={player.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3"
              >
                {/* Player name + average */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-zinc-400">{player.number}</span>
                    </div>
                    <p className="font-semibold text-zinc-200">{player.name}</p>
                  </div>

                  {avg !== null ? (
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${scoreBadgeClass(avg)}`}
                    >
                      <Star size={13} className={scoreColor(avg)} />
                      <span className={scoreColor(avg)}>{avg.toFixed(1)}</span>
                      <span className="text-zinc-600 text-xs font-normal">avg</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">Not rated</span>
                  )}
                </div>

                {/* Per-responder scores */}
                {individualScores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {individualScores.map(({ responder, score }) => (
                      <div
                        key={responder}
                        className="flex items-center gap-1.5 text-xs bg-zinc-800 rounded-lg px-2.5 py-1.5 border border-zinc-700"
                      >
                        <span className="text-zinc-400">{responder}</span>
                        <span className="text-zinc-600">—</span>
                        <span className={`font-semibold ${scoreColor(score)}`}>{score}/10</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback comments */}
                {feedback.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    {feedback.map(({ responder, text, date }) => (
                      <div key={`${responder}-${date}`}>
                        <span className="text-xs font-medium text-zinc-500">{responder}</span>
                        <p className="text-sm text-zinc-400 mt-0.5 leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Clip timestamps — rendered as Veo deep-links when veoUrl is set */}
                {veoUrl && (() => {
                  const raw = player.stats as Record<string, unknown> | undefined
                  const clips = (raw?.clips ?? raw?.events ?? raw?.timestamps) as
                    | { time?: number; t?: number; timestamp?: number; label?: string; note?: string; tag?: string }[]
                    | undefined
                  if (!Array.isArray(clips) || clips.length === 0) return null
                  return (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/80">
                      {clips.map((clip, i) => {
                        const sec = clip.time ?? clip.t ?? clip.timestamp
                        if (typeof sec !== 'number') return null
                        const label = clip.label ?? clip.note ?? clip.tag
                        return (
                          <a
                            key={i}
                            href={veoLink(veoUrl, sec)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md px-2 py-1 hover:bg-blue-500/20 transition-colors"
                          >
                            <PlayCircle size={11} />
                            {label ? `${label} · ` : ''}
                            {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}
                          </a>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
