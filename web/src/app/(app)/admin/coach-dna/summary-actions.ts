'use server'

import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { computeSelfOnlyCategoryScores } from '@/lib/coach-dna/self-score'
import { deriveArchetype } from '@/lib/coach-dna/archetype'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher', technician: 'Technician', motivator: 'Motivator', developer: 'Developer',
  'game-manager': 'Game Manager', communicator: 'Communicator', organiser: 'Organiser', 'culture-builder': 'Culture Builder',
}

export async function generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (!attempt.completed_at) throw new Error('This attempt is not completed yet')

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option')
    .eq('attempt_id', attemptId)

  const optionIds = (responses ?? []).map(r => r.selected_option).filter((id): id is string => id !== null)
  const { data: options } = await supabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)

  const scores = computeSelfOnlyCategoryScores(
    (responses ?? []).map(r => ({ selectedOptionId: r.selected_option ?? '' })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )
  const archetype = deriveArchetype(scores)

  const prompt = `You are writing a short self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, encouraging coaching voice. No em dashes. No fluff.

Their primary coaching type: ${CATEGORY_LABELS[archetype.primaryType]}
${archetype.secondaryType ? `Their secondary type: ${CATEGORY_LABELS[archetype.secondaryType]}` : ''}

Their strongest categories (write one short encouraging sentence for each, referencing what that category means): ${archetype.pros.map(slug => CATEGORY_LABELS[slug]).join(', ')}
Their growth-area categories (write one short constructive sentence for each): ${archetype.cons.map(slug => CATEGORY_LABELS[slug]).join(', ')}

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources — that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. Shape:
{"narrative":"one paragraph, 2-4 sentences","pros":[{"categorySlug":"...","text":"one sentence"}],"cons":[{"categorySlug":"...","text":"one sentence"}]}`

  const { text } = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your summary right now')
  const parsed = JSON.parse(text.slice(start, end + 1)) as { narrative: string; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] }

  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    pros: parsed.pros,
    cons: parsed.cons,
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
