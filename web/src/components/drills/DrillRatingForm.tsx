'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star } from 'lucide-react'
import { submitRating } from '@/app/(discover)/drills/actions'

interface DrillRatingFormProps {
  drillId: string
  existingRating?: number
  existingComment?: string
}

export function DrillRatingForm({ drillId, existingRating, existingComment }: DrillRatingFormProps) {
  const [rating, setRating] = useState(existingRating ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(existingComment ?? '')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function submit() {
    if (!rating) return
    startTransition(async () => {
      await submitRating(drillId, rating, comment)
      setDone(true)
    })
  }

  if (done) {
    return <p className="text-sm text-muted-foreground">Rating submitted. Thanks!</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Rate this drill</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
          >
            <Star
              className={`size-6 transition-colors ${
                n <= (hovered || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Add a comment (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
      />
      <Button size="sm" onClick={submit} disabled={!rating || isPending}>
        {isPending ? 'Submitting…' : existingRating ? 'Update rating' : 'Submit rating'}
      </Button>
    </div>
  )
}
