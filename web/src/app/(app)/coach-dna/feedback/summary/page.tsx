import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ensureFreshFeedbackSummary } from '@/lib/coach-dna/feedback-summary-actions'
import { feedbackBandLabel, type FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'
import { labelFor } from '@/lib/coach-dna/categories'

export const metadata = { title: 'Coach DNA — Feedback Breakdown' }

function FeedbackTypeSection({ heading, summary }: { heading: string; summary: FeedbackTypeSummary }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-100 mb-2">{heading}</h2>
      {summary.ready ? (
        <ul className="space-y-3">
          {summary.categories.map(category => (
            <li key={category.categorySlug} className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-medium">{labelFor(category.categorySlug)}</span>
              <span className="text-zinc-500"> · {feedbackBandLabel(category.averageRating)} · {category.averageRating.toFixed(1)}/5</span>
              <p className="mt-0.5">{category.text}</p>
              {category.resources.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
                  {category.resources.map(resource => (
                    <li key={resource.title} className="text-xs text-zinc-500">
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 font-medium"
                        >
                          {resource.title}
                        </a>
                      ) : (
                        <span className="text-zinc-300 font-medium">{resource.title}</span>
                      )}
                      {' — '}{resource.description}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">Not enough responses yet — check back once more feedback comes in.</p>
      )}
    </div>
  )
}

export default async function FeedbackSummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const summary = await ensureFreshFeedbackSummary(user.id)

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Feedback breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FeedbackTypeSection heading="Player / Parent Voice" summary={summary.playerParentVoice} />
          <FeedbackTypeSection heading="Peer Observation" summary={summary.peerObservation} />
        </CardContent>
      </Card>
    </div>
  )
}
