import type { createClient } from '@/lib/supabase/server'
import type { createServiceClient } from '@/lib/supabase/service'
import { computeSelfOnlyCategoryScores } from './self-score'
import { deriveArchetype, type ArchetypeResult } from './archetype'
import { fetchBlendInputs } from './blend-inputs'
import { computeCategoryScore, type SourceInput } from './scoring'
import { getCategoryWeights, getSourceThresholds, type ScoreSource } from './config'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type ServiceClient = ReturnType<typeof createServiceClient>

export interface BlendedArchetypeResult {
  archetype: ArchetypeResult
  sourcedCategories: Record<string, ScoreSource[]>
}

/** Self-assessment scores blended with cleared external feedback, category by
 *  category -- the same computation generateSelfAssessmentSummary persists,
 *  extracted so a caller (ensureFreshSummary) can cheaply re-derive it (no AI
 *  call) to check whether a cached summary is stale. */
export async function computeBlendedArchetype(
  supabase: SupabaseClient,
  serviceSupabase: ServiceClient,
  attemptId: string,
  coachId: string,
  completedAt: string,
): Promise<BlendedArchetypeResult> {
  const { data: responses, error: responsesError } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option, least_option')
    .eq('attempt_id', attemptId)
  if (responsesError) throw new Error(responsesError.message)
  if (!responses || responses.length === 0) throw new Error('No responses found for this completed attempt')

  const incompleteResponse = responses.find(r => !r.selected_option || !r.least_option)
  if (incompleteResponse) {
    throw new Error('This attempt was started before the current assessment format and cannot be scored. Please retake the assessment.')
  }

  const optionIds = Array.from(
    new Set(responses.flatMap(r => [r.selected_option as string, r.least_option as string])),
  )
  const { data: options, error: optionsError } = await serviceSupabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)
  if (optionsError) throw new Error(optionsError.message)

  const scores = computeSelfOnlyCategoryScores(
    responses.map(r => ({ mostOptionId: r.selected_option as string, leastOptionId: r.least_option as string })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )

  const blendInputsByCategory = await fetchBlendInputs(serviceSupabase, coachId)
  const sourcedCategories: Record<string, ScoreSource[]> = {}
  const blendedScores = scores.map(({ categorySlug, score }) => {
    const inputs: SourceInput[] = [
      { source: 'self', responses: [{ value: score, submittedAt: completedAt }] },
      ...(blendInputsByCategory[categorySlug] ?? []),
    ]
    const result = computeCategoryScore(inputs, getCategoryWeights(categorySlug), getSourceThresholds(categorySlug), new Date())
    if (result.status === 'scored') {
      sourcedCategories[categorySlug] = result.activeSources
      return { categorySlug, score: result.blendedScore }
    }
    sourcedCategories[categorySlug] = ['self']
    return { categorySlug, score }
  })

  return { archetype: deriveArchetype(blendedScores), sourcedCategories }
}
