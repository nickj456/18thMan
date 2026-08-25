'use server'

import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { labelFor } from '@/lib/coach-dna/categories'
import { resourcesFor } from '@/lib/coach-dna/resources'
import { computeBlendedArchetype } from '@/lib/coach-dna/blended-archetype'
import { isCurrentSummaryShape } from '@/lib/coach-dna/summary-shape'
import { sourcedCategoriesEqual } from '@/lib/coach-dna/blend-status'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

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

function isValidSummaryShape(
  value: unknown,
): value is { narrative: string; categories: { categorySlug: string; text: string }[] } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.narrative === 'string' &&
    candidate.narrative.trim().length > 0 &&
    isCategoryTextEntryArray(candidate.categories)
  )
}

export async function generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (!attempt.completed_at) throw new Error('This attempt is not completed yet')

  // `category_weights_json` is revoked from the `authenticated` role (migration
  // 109 closed a scoring-weight leak), so the scoring weights can only be read
  // with the service role. Ownership of this attempt is already verified above,
  // and only the derived scores ever leave this function.
  const serviceSupabase = createServiceClient()
  const { archetype, sourcedCategories } = await computeBlendedArchetype(
    supabase,
    serviceSupabase,
    attemptId,
    user.id,
    attempt.completed_at as string,
  )

  const prompt = `You are writing a self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, professional coaching voice — confident and specific, not hype, not generic praise. No em dashes. No fluff.

Their primary coaching type: ${labelFor(archetype.primaryType)}
${archetype.secondaryType ? `Their secondary type: ${labelFor(archetype.secondaryType)}` : ''}

For each of the 8 categories below, write text in the voice appropriate to its tier:
- "strength": one confident sentence naming what this strength looks like in practice.
- "solid": one plain sentence on what steady performance in this category looks like for them — not a strength to lead with, not a gap, just solid ground.
- "focus": 2-3 sentences — what the gap looks like in practice, and one concrete thing to try.

Categories, in this exact order (write one entry per category, same order, referencing the tier given):
${archetype.categories.map(c => `${labelFor(c.categorySlug)} (tier: ${c.tier}, score: ${c.score}/100)`).join('\n')}

Vary sentence structure and opening across categories of the same tier — do not open every "focus" entry with the same phrase. Each should read like it was written fresh.

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources - that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly 8 entries, in the same order as the list above. Shape:
{"narrative":"one paragraph, 2-4 sentences summarizing the overall picture","categories":[{"categorySlug":"...","text":"..."}]}`

  const { text } = await generateText({ model: groq('openai/gpt-oss-120b'), prompt })

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

  // The model only writes prose. Which categories are strengths, solid ground,
  // or focus areas (and their slugs/scores) always comes from the
  // TypeScript-computed archetype, so a model that returns a label, a
  // misspelled slug, or a reordered list can never corrupt the structure or
  // produce an unresolvable label at render time.
  if (parsed.categories.length !== archetype.categories.length) {
    throw new Error('Could not generate your summary right now')
  }

  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    categories: archetype.categories.map((entry, i) => ({
      categorySlug: entry.categorySlug,
      score: entry.score,
      tier: entry.tier,
      text: parsed.categories[i].text,
      resources: entry.tier === 'focus' ? resourcesFor(entry.categorySlug) : [],
    })),
    sourcedCategories,
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

/** Returns the cached summary if it already reflects current feedback data,
 *  otherwise regenerates it (one AI call) first. Does not perform its own
 *  auth/role check -- callers (the hub page, the /complete page, the two
 *  outcome-PDF routes) already ran theirs before calling this, and this
 *  function's call path is reachable from a Route Handler where redirect()
 *  does not behave correctly. Only the data-level ownership/completed-at
 *  check is this function's own responsibility. */
export async function ensureFreshSummary(attemptId: string, coachId: string): Promise<SelfAssessmentSummary> {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== coachId || !attempt.completed_at) {
    throw new Error('This attempt is not a completed attempt belonging to this coach')
  }

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', coachId)
    .maybeSingle()
  const cached = coachProfile?.ai_summary as SelfAssessmentSummary | null

  const { archetype, sourcedCategories } = await computeBlendedArchetype(
    supabase,
    serviceSupabase,
    attemptId,
    coachId,
    attempt.completed_at as string,
  )

  const archetypeUnchanged =
    cached?.primaryType === archetype.primaryType &&
    cached?.secondaryType === archetype.secondaryType &&
    cached?.categories[0]?.categorySlug === archetype.categories[0].categorySlug &&
    cached?.categories[archetype.categories.length - 1]?.categorySlug === archetype.categories[archetype.categories.length - 1].categorySlug

  if (
    cached &&
    isCurrentSummaryShape(cached) &&
    archetypeUnchanged &&
    sourcedCategoriesEqual(cached.sourcedCategories, sourcedCategories)
  ) {
    return cached
  }

  return generateSelfAssessmentSummary(attemptId)
}
