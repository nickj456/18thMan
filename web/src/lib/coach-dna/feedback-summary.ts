import type { createServiceClient } from '@/lib/supabase/service'
import { RESPONDENT_TO_SOURCE } from './blend-inputs'
import { getSourceThresholds, type ScoreSource } from './config'
import { resourcesFor } from './resources'

type ServiceClient = ReturnType<typeof createServiceClient>

export interface FeedbackCategorySummary {
  categorySlug: string
  averageRating: number
  responseCount: number
  /** AI-written interpretation of this category's rating -- left '' by this pure aggregation function, filled in by ensureFreshFeedbackSummary (Task 3). */
  text: string
  /** Non-empty when averageRating < 3.5. */
  resources: { title: string; description: string; url: string | null }[]
}

export interface FeedbackTypeSummary {
  ready: boolean
  responseCount: number
  categories: FeedbackCategorySummary[]
}

export interface FeedbackSummaryData {
  playerParentVoice: FeedbackTypeSummary
  peerObservation: FeedbackTypeSummary
}

const EMPTY_TYPE_SUMMARY: FeedbackTypeSummary = { ready: false, responseCount: 0, categories: [] }

/** Plain-language band for a feedback category's average rating -- same 3.5 cutoff that governs resource attachment below. Feedback categories have no rank-based tier (unlike self-assessment's fixed 8 -- a section may clear the anonymity threshold for one category and not another), so this is a simple two-band label, not `tierLabel`. */
export function feedbackBandLabel(averageRating: number): string {
  return averageRating >= 3.5 ? 'Strong' : 'Focus area'
}

/** Cleared, non-excluded external feedback for a coach, aggregated into
 *  simple per-category averages for the downloadable feedback summary PDF --
 *  deliberately not the recency-weighted/outlier-capped blend
 *  computeCategoryScore uses for the live score, since this is a readable
 *  snapshot, not a precise blended score. A category is withheld until it
 *  clears the same anonymity threshold (getSourceThresholds) the live
 *  scoring engine already enforces. */
export async function computeFeedbackSummary(
  supabase: ServiceClient,
  coachId: string,
): Promise<FeedbackSummaryData> {
  const { data: requests } = await supabase.from('feedback_requests').select('id').eq('coach_id', coachId)
  const requestIds = (requests ?? []).map(r => r.id as string)
  if (requestIds.length === 0) {
    return { playerParentVoice: EMPTY_TYPE_SUMMARY, peerObservation: EMPTY_TYPE_SUMMARY }
  }

  const { data: responses } = await supabase
    .from('feedback_responses')
    .select('id, respondent_type')
    .in('feedback_request_id', requestIds)
    .eq('held_for_review', false)
  const responseRows = (responses ?? []) as { id: string; respondent_type: string }[]
  if (responseRows.length === 0) {
    return { playerParentVoice: EMPTY_TYPE_SUMMARY, peerObservation: EMPTY_TYPE_SUMMARY }
  }

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

  // categorySlug -> source -> ratings[]
  const ratingsByCategoryAndSource = new Map<string, Map<ScoreSource, number[]>>()
  // source -> Set of cleared response ids (for the type's total response count)
  const clearedResponseIdsBySource = new Map<ScoreSource, Set<string>>()

  for (const answer of answerRows) {
    if (excludedIds.has(answer.feedback_response_id)) continue
    const response = responseById.get(answer.feedback_response_id)
    if (!response) continue
    const source = RESPONDENT_TO_SOURCE[response.respondent_type]
    if (!source) continue
    const slug = answer.assessment_questions.dna_categories.slug

    if (!ratingsByCategoryAndSource.has(slug)) ratingsByCategoryAndSource.set(slug, new Map())
    const bySource = ratingsByCategoryAndSource.get(slug)!
    if (!bySource.has(source)) bySource.set(source, [])
    bySource.get(source)!.push(answer.numeric_value)

    if (!clearedResponseIdsBySource.has(source)) clearedResponseIdsBySource.set(source, new Set())
    clearedResponseIdsBySource.get(source)!.add(response.id)
  }

  function average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  function buildTypeSummary(sources: ScoreSource[]): FeedbackTypeSummary {
    const categories: FeedbackCategorySummary[] = []
    for (const [slug, bySource] of ratingsByCategoryAndSource) {
      const combined = sources.flatMap(source => bySource.get(source) ?? [])
      const threshold = Math.min(...sources.map(source => getSourceThresholds(slug)[source]))
      if (combined.length >= threshold) {
        const averageRating = average(combined)
        categories.push({
          categorySlug: slug,
          averageRating,
          responseCount: combined.length,
          text: '',
          resources: averageRating < 3.5 ? resourcesFor(slug) : [],
        })
      }
    }
    const responseIdSet = new Set<string>()
    for (const source of sources) {
      for (const id of clearedResponseIdsBySource.get(source) ?? []) responseIdSet.add(id)
    }
    return { ready: categories.length > 0, responseCount: responseIdSet.size, categories }
  }

  return {
    playerParentVoice: buildTypeSummary(['player_voice', 'parent_voice']),
    peerObservation: buildTypeSummary(['peer_observation']),
  }
}
