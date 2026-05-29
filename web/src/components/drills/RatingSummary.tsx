import { Star } from 'lucide-react'

interface Rating {
  rating: number | null
}

interface Props {
  ratings: Rating[]
}

export function RatingSummary({ ratings }: Props) {
  const withRating = ratings.filter(r => r.rating !== null)
  if (withRating.length === 0) return null

  const avg = withRating.reduce((sum, r) => sum + r.rating!, 0) / withRating.length
  const total = withRating.length

  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: withRating.filter(r => r.rating === star).length,
    pct: (withRating.filter(r => r.rating === star).length / total) * 100,
  }))

  return (
    <div className="flex gap-8 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Average */}
      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
        <span className="text-4xl font-bold text-white">{avg.toFixed(1)}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <Star
              key={n}
              className={`size-3.5 ${n <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{total} review{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-1.5 justify-center flex flex-col">
        {distribution.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-3 text-right">{star}</span>
            <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-3">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
