'use server'

import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { computeSelfOnlyCategoryScores } from '@/lib/coach-dna/self-score'
import { deriveArchetype } from '@/lib/coach-dna/archetype'
import { labelFor } from '@/lib/coach-dna/categories'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

function isCategoryEntryArray(value: unknown): value is { categorySlug: string; text: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      entry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).categorySlug === 'string' &&
        typeof (entry as Record<string, unknown>).text === 'string',
    )
  )
}

function isValidSummaryShape(
  value: unknown,
): value is { narrative: string; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.narrative === 'string' &&
    candidate.narrative.trim().length > 0 &&
    isCategoryEntryArray(candidate.pros) &&
    isCategoryEntryArray(candidate.cons)
  )
}

export async function generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary> {
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
  if (!attempt.completed_at) throw new Error('This attempt is not completed yet')

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
  // `category_weights_json` is revoked from the `authenticated` role (migration
  // 109 closed a scoring-weight leak), so the scoring weights can only be read
  // with the service role. Ownership of this attempt is already verified above,
  // and only the derived scores ever leave this function.
  const serviceSupabase = createServiceClient()
  const { data: options, error: optionsError } = await serviceSupabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)
  if (optionsError) throw new Error(optionsError.message)

  const scores = computeSelfOnlyCategoryScores(
    responses.map(r => ({ mostOptionId: r.selected_option as string, leastOptionId: r.least_option as string })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )
  const archetype = deriveArchetype(scores)

  const prompt = `You are writing a short self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, encouraging coaching voice. No em dashes. No fluff.

Their primary coaching type: ${labelFor(archetype.primaryType)}
${archetype.secondaryType ? `Their secondary type: ${labelFor(archetype.secondaryType)}` : ''}

Their strongest categories, in this exact order (write one short encouraging sentence for each, referencing what that category means, and return them in the same order): ${archetype.pros.map(slug => labelFor(slug)).join(', ')}
Their growth-area categories, in this exact order (write one short constructive sentence for each, in the same order): ${archetype.cons.map(slug => labelFor(slug)).join(', ')}

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources - that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "pros" must contain exactly ${archetype.pros.length} entries and "cons" exactly ${archetype.cons.length}, in the same order as the lists above. Shape:
{"narrative":"one paragraph, 2-4 sentences","pros":[{"categorySlug":"...","text":"one sentence"}],"cons":[{"categorySlug":"...","text":"one sentence"}]}`

  const { text } = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your summary right now')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('Could not generate your summary right now')
  }
  if (!isValidSummaryShape(parsed)) throw new Error('Could not generate your summary right now')

  // The model only writes prose. Which categories are strengths vs focus areas
  // (and their slugs) always comes from the TypeScript-computed archetype, so a
  // model that returns a label, a misspelled slug, or a reordered list can never
  // corrupt the structure or produce an unresolvable label at render time.
  if (parsed.pros.length !== archetype.pros.length || parsed.cons.length !== archetype.cons.length) {
    throw new Error('Could not generate your summary right now')
  }

  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    pros: archetype.pros.map((categorySlug, i) => ({ categorySlug, text: parsed.pros[i].text })),
    cons: archetype.cons.map((categorySlug, i) => ({ categorySlug, text: parsed.cons[i].text })),
  }

  const { error: upsertError } = await supabase
    .from('coach_profiles')
    .upsert(
      {
        user_id: user.id,
        primary_profile_type: archetype.primaryType,
        secondary_profile_type: archetype.secondaryType,
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  return summary
}
