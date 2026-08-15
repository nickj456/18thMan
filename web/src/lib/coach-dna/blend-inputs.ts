import type { createServiceClient } from '@/lib/supabase/service'
import type { SourceInput, SourceResponse } from './scoring'
import type { ScoreSource } from './config'

type ServiceClient = ReturnType<typeof createServiceClient>

const RESPONDENT_TO_SOURCE: Record<string, ScoreSource> = {
  player: 'player_voice',
  parent: 'parent_voice',
  peer_coach: 'peer_observation',
}

/** 1-5 rating -> 0-100, matching SourceResponse.value's expected range. */
function normalizeRating(numericValue: number): number {
  return ((numericValue - 1) / 4) * 100
}

/** Cleared, non-excluded external feedback for a coach, grouped by category
 *  slug and mapped ScoreSource -- ready to merge with the self input and
 *  hand to computeCategoryScore. Never includes 'self'. */
export async function fetchBlendInputs(
  supabase: ServiceClient,
  coachId: string,
): Promise<Record<string, SourceInput[]>> {
  const { data: requests } = await supabase.from('feedback_requests').select('id').eq('coach_id', coachId)
  const requestIds = (requests ?? []).map(r => r.id as string)
  if (requestIds.length === 0) return {}

  const { data: responses } = await supabase
    .from('feedback_responses')
    .select('id, respondent_type, submitted_at')
    .in('feedback_request_id', requestIds)
    .eq('held_for_review', false)
  const responseRows = (responses ?? []) as { id: string; respondent_type: string; submitted_at: string }[]
  if (responseRows.length === 0) return {}

  const responseIds = responseRows.map(r => r.id)

  const { data: disputes } = await supabase
    .from('response_disputes')
    .select('feedback_response_id')
    .in('feedback_response_id', responseIds)
    .eq('status', 'excluded')
  const excludedIds = new Set((disputes ?? []).map(d => d.feedback_response_id as string))

  const { data: answers } = await supabase
    .from('feedback_answers')
    .select('numeric_value, feedback_response_id, question_id, assessment_questions!inner(dna_categories!inner(slug))')
    .in('feedback_response_id', responseIds)
    .not('numeric_value', 'is', null)
  type AnswerRow = {
    numeric_value: number
    feedback_response_id: string
    question_id: string
    assessment_questions: { dna_categories: { slug: string } }
  }
  const answerRows = (answers ?? []) as unknown as AnswerRow[]

  const responseById = new Map(responseRows.map(r => [r.id, r]))

  // categorySlug -> ScoreSource -> SourceResponse[]
  const grouped = new Map<string, Map<ScoreSource, SourceResponse[]>>()

  for (const answer of answerRows) {
    if (excludedIds.has(answer.feedback_response_id)) continue
    const response = responseById.get(answer.feedback_response_id)
    if (!response) continue
    const source = RESPONDENT_TO_SOURCE[response.respondent_type]
    if (!source) continue
    const slug = answer.assessment_questions.dna_categories.slug

    if (!grouped.has(slug)) grouped.set(slug, new Map())
    const bySource = grouped.get(slug)!
    if (!bySource.has(source)) bySource.set(source, [])
    bySource.get(source)!.push({ value: normalizeRating(answer.numeric_value), submittedAt: response.submitted_at })
  }

  const result: Record<string, SourceInput[]> = {}
  for (const [slug, bySource] of grouped) {
    result[slug] = [...bySource.entries()].map(([source, responses]) => ({ source, responses }))
  }
  return result
}
