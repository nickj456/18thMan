import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, ArrowRight, Users, Calendar } from 'lucide-react'

export const metadata = { title: 'Match Reviews — 18th Man' }

type SquadReview = {
  id: string
  club: string
  opposition: string
  match_info: { date?: string; venue?: string; round?: string } | null
  shared_by: string
  created_at: string
}

export default async function MyReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: reviews } = await supabase
    .from('squad_reviews')
    .select('id, club, opposition, match_info, shared_by, created_at')
    .order('created_at', { ascending: false })

  const list = (reviews ?? []) as SquadReview[]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <ClipboardCheck size={18} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">Match Reviews</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {list.length} review{list.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <ClipboardCheck size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No match reviews yet.</p>
          <p className="text-xs text-zinc-600">
            Share a squad review from the Match Analyst app and it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(review => {
            const matchInfo = review.match_info
            return (
              <Link
                key={review.id}
                href={`/my-reviews/${review.id}`}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <ClipboardCheck size={16} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {review.club} <span className="text-zinc-500">vs</span> {review.opposition}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 flex-wrap">
                      {matchInfo?.round && <span>{matchInfo.round}</span>}
                      {matchInfo?.date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(matchInfo.date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {review.shared_by}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="text-zinc-600 group-hover:translate-x-0.5 transition-transform shrink-0"
                />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
