import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress, getPreviousQuestionId } from '@/lib/coach-dna/assessment-progress'
import { OptionCard } from './OptionCard'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Coach DNA — Self-Assessment' }

export default async function AssessmentQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { attemptId } = await params
  const { q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (attempt.completed_at) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const { data: orderedQuestions } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })
  const questions = orderedQuestions ?? []

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option')
    .eq('attempt_id', attemptId)
  const answeredIds = (responses ?? []).map(r => r.question_id)

  const progress = getQuestionProgress(questions, answeredIds)
  const currentQuestionId = q && questions.some(quest => quest.id === q) ? q : progress.nextQuestion?.id

  if (!currentQuestionId) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const position = questions.findIndex(quest => quest.id === currentQuestionId) + 1
  const previousQuestionId = getPreviousQuestionId(questions, currentQuestionId)
  const existingResponse = (responses ?? []).find(r => r.question_id === currentQuestionId)

  const { data: question } = await supabase
    .from('assessment_questions')
    .select('id, question_text')
    .eq('id', currentQuestionId)
    .single()

  // SECURITY: select only id and option_text. Never add the hidden scoring/weighting
  // column to this query — that data must not reach the client.
  const { data: options } = await supabase
    .from('assessment_options')
    .select('id, option_text')
    .eq('question_id', currentQuestionId)

  if (!question) redirect('/admin/coach-dna')

  return (
    <div className="space-y-6 max-w-2xl">
      {previousQuestionId ? (
        <Link
          href={`/admin/coach-dna/assessment/${attemptId}?q=${previousQuestionId}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </Link>
      ) : (
        <Link
          href="/admin/coach-dna"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Exit
        </Link>
      )}

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Question {position} of {questions.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${(position / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="app-heading text-xl">{question.question_text}</h1>

      <div className="space-y-3">
        {(options ?? []).map(option => (
          <OptionCard
            key={option.id}
            attemptId={attemptId}
            questionId={currentQuestionId}
            optionId={option.id}
            optionText={option.option_text}
            isSelected={existingResponse?.selected_option === option.id}
          />
        ))}
      </div>
    </div>
  )
}
