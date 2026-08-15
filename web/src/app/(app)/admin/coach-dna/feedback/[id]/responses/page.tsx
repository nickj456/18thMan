import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DisputeButton } from './DisputeButton'

export const metadata = { title: 'Feedback Responses' }
export const dynamic = 'force-dynamic'

export default async function FeedbackResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: request } = await supabase
    .from('feedback_requests')
    .select('id, coach_id, feedback_type')
    .eq('id', id)
    .single()
  if (!request || request.coach_id !== user.id) redirect('/admin/coach-dna/feedback')

  // RLS (093) already scopes this to held_for_review = false responses on
  // the coach's own request -- no manual filter needed beyond the request id.
  const { data: responses } = await supabase
    .from('feedback_responses')
    .select('id, respondent_type, submitted_at')
    .eq('feedback_request_id', id)
    .order('submitted_at', { ascending: false })

  const responseIds = (responses ?? []).map(r => r.id)
  const { data: answers } = responseIds.length > 0
    ? await supabase
      .from('feedback_answers')
      .select('feedback_response_id, question_id, numeric_value, written_value')
      .in('feedback_response_id', responseIds)
    : { data: [] }

  const answersByResponse = new Map<string, { numeric_value: number | null; written_value: string | null }[]>()
  for (const a of answers ?? []) {
    const list = answersByResponse.get(a.feedback_response_id) ?? []
    list.push({ numeric_value: a.numeric_value, written_value: a.written_value })
    answersByResponse.set(a.feedback_response_id, list)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="app-heading text-2xl">Feedback Responses</h1>

      {(responses ?? []).length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">No responses yet.</CardContent>
        </Card>
      )}

      {(responses ?? []).map(response => {
        const responseAnswers = answersByResponse.get(response.id) ?? []
        const ratings = responseAnswers.filter(a => a.numeric_value !== null).map(a => a.numeric_value as number)
        const comment = responseAnswers.find(a => a.written_value)?.written_value ?? null
        const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—'

        return (
          <Card key={response.id}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{response.respondent_type.replace('_', ' ')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-400">Average rating: <span className="text-zinc-200">{avg} / 5</span></p>
              {comment && <p className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md p-3">{comment}</p>}
              <DisputeButton feedbackResponseId={response.id} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
