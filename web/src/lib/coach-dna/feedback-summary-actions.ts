'use server'

import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { labelFor } from './categories'
import { computeFeedbackSummary, type FeedbackSummaryData, type FeedbackCategorySummary } from './feedback-summary'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

function isCategoryTextEntryArray(value: unknown): value is { categorySlug: string; text: string }[] {
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

function allCategories(data: FeedbackSummaryData): FeedbackCategorySummary[] {
  return [...data.playerParentVoice.categories, ...data.peerObservation.categories]
}

function withText(section: FeedbackSummaryData['playerParentVoice'], textBySlug: Map<string, string>): FeedbackSummaryData['playerParentVoice'] {
  return { ...section, categories: section.categories.map(c => ({ ...c, text: textBySlug.get(c.categorySlug) ?? c.text })) }
}

function cacheMatchesFresh(cached: FeedbackSummaryData | null, fresh: FeedbackSummaryData): boolean {
  if (!cached) return false
  const sameSection = (a: FeedbackSummaryData['playerParentVoice'], b: FeedbackSummaryData['playerParentVoice']) => {
    if (a.categories.length !== b.categories.length) return false
    return a.categories.every(catA => {
      const catB = b.categories.find(c => c.categorySlug === catA.categorySlug)
      return catB && Math.abs(catA.averageRating - catB.averageRating) < 0.05 && catA.responseCount === catB.responseCount
    })
  }
  return sameSection(cached.playerParentVoice, fresh.playerParentVoice) && sameSection(cached.peerObservation, fresh.peerObservation)
}

/** Returns the cached feedback summary if it already reflects the current
 *  aggregation, otherwise regenerates its AI interpretation (one Groq call
 *  covering every category across both sections) first. Mirrors
 *  ensureFreshSummary's cache-or-regenerate shape in summary-actions.ts,
 *  but keyed on the aggregation's own rating/count drift rather than an
 *  archetype-rank drift, since feedback categories aren't ranked. */
export async function ensureFreshFeedbackSummary(coachId: string): Promise<FeedbackSummaryData> {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const fresh = await computeFeedbackSummary(serviceSupabase, coachId)

  const categoriesNeedingText = allCategories(fresh)
  if (categoriesNeedingText.length === 0) return fresh

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_feedback_summary')
    .eq('user_id', coachId)
    .maybeSingle()
  const cached = (coachProfile?.ai_feedback_summary ?? null) as FeedbackSummaryData | null

  if (cacheMatchesFresh(cached, fresh)) return cached!

  const prompt = `You are writing short interpretations of player, parent, and peer feedback for a rugby league coach. Write in a direct, professional coaching voice — confident and specific, not hype. No em dashes. No fluff. This is feedback FROM other people, not the coach's own self-assessment — write about what others observed, not what the coach believes about themselves.

For each category below, write 1-2 sentences interpreting what this rating suggests, given the category and the number of responses it's based on. A rating at or above 3.5/5 should read as an affirming, specific observation. A rating below 3.5/5 should name what the gap likely looks like in practice and gesture at what to try, without being harsh.

Categories, in this exact order:
${categoriesNeedingText.map(c => `${labelFor(c.categorySlug)}: ${c.averageRating.toFixed(1)}/5 (${c.responseCount} responses)`).join('\n')}

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly ${categoriesNeedingText.length} entries, in the same order as the list above. Shape:
{"categories":[{"categorySlug":"...","text":"..."}]}`

  const { text } = await generateText({ model: groq('openai/gpt-oss-120b'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your feedback summary right now')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('Could not generate your feedback summary right now')
  }
  if (typeof parsed !== 'object' || parsed === null || !isCategoryTextEntryArray((parsed as Record<string, unknown>).categories)) {
    throw new Error('Could not generate your feedback summary right now')
  }
  const parsedCategories = (parsed as { categories: { categorySlug: string; text: string }[] }).categories
  if (parsedCategories.length !== categoriesNeedingText.length) {
    throw new Error('Could not generate your feedback summary right now')
  }

  // The model only writes prose -- slugs and order always come from the
  // aggregation, never the model, same invariant as generateSelfAssessmentSummary.
  const textBySlug = new Map(categoriesNeedingText.map((c, i) => [c.categorySlug, parsedCategories[i].text]))

  const result: FeedbackSummaryData = {
    playerParentVoice: withText(fresh.playerParentVoice, textBySlug),
    peerObservation: withText(fresh.peerObservation, textBySlug),
  }

  const { error: upsertError } = await supabase
    .from('coach_profiles')
    .upsert(
      { user_id: coachId, ai_feedback_summary: result, ai_feedback_summary_generated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  return result
}
