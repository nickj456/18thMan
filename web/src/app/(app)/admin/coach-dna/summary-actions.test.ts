// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  responses: { question_id: string; selected_option: string | null; least_option: string | null }[]
  responsesError: { message: string } | null
  options: { id: string; question_id: string; category_weights_json: Record<string, number> }[]
  optionsError: { message: string } | null
  aiText: string
  upsertError: { message: string } | null
} = {
  user: null,
  role: 'admin',
  attempt: null,
  responses: [],
  responsesError: null,
  options: [],
  optionsError: null,
  aiText: '',
  upsertError: null,
}

const upsertMock = vi.fn(async (_row: { ai_summary: { pros: { categorySlug: string }[] } }, _opts?: unknown) => ({
  error: state.upsertError,
}))
/** Records which client each table read went through, so a regression back to
 *  the anon client for `assessment_options` (whose `category_weights_json` is
 *  service-role-only — migration 109) fails the suite. */
const tableReads: { client: 'user' | 'service'; table: string }[] = []

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => () => 'mock-model',
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      tableReads.push({ client: 'user', table })
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }) }) }
      }
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'assessment_responses') {
        return { select: () => ({ eq: async () => ({ data: state.responses, error: state.responsesError }) }) }
      }
      if (table === 'coach_profiles') {
        return { upsert: upsertMock }
      }
      // `assessment_options` must NOT be readable through the user client:
      // its `category_weights_json` column is granted to service_role only.
      throw new Error(`unexpected table on user client: ${table}`)
    },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      tableReads.push({ client: 'service', table })
      if (table === 'assessment_options') {
        return { select: () => ({ in: async () => ({ data: state.options, error: state.optionsError }) }) }
      }
      throw new Error(`unexpected table on service client: ${table}`)
    },
  }),
}))

import { generateSelfAssessmentSummary } from './summary-actions'

// Derived from most option weighted 100 to `teacher` and least option weighted
// 100 to `motivator`: teacher scores high, motivator scores low, others tie at 0
// and fall back to CATEGORY_ORDER for tie-breaking.
const EXPECTED_PROS = ['teacher', 'technician', 'developer']
const EXPECTED_CONS = ['motivator', 'culture-builder', 'organiser']

describe('generateSelfAssessmentSummary', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    tableReads.length = 0
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
    state.responsesError = null
    state.options = [
      { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
      { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
    ]
    state.optionsError = null
    // Note the deliberately bogus slugs: the action must ignore them entirely
    // and use the TypeScript-computed archetype slugs instead.
    state.aiText = JSON.stringify({
      narrative: 'You lead with clarity and patience.',
      pros: [
        { categorySlug: 'Teacher', text: 'You explain things well.' },
        { categorySlug: 'nonsense', text: 'Your detail work is sharp.' },
        { categorySlug: '', text: 'You lift the room.' },
      ],
      cons: [
        { categorySlug: 'Culture Builder', text: 'Set the tone more explicitly.' },
        { categorySlug: 'nonsense', text: 'Sessions could run tighter.' },
        { categorySlug: '', text: 'Say less, say it clearer.' },
      ],
    })
    state.upsertError = null
    upsertMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects non-admin callers to the dashboard', async () => {
    state.role = 'coach'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects callers with no profile row to the dashboard', async () => {
    state.role = null
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('reads assessment_options through the service client, never the user client', async () => {
    await generateSelfAssessmentSummary('attempt-1')

    expect(tableReads).toContainEqual({ client: 'service', table: 'assessment_options' })
    expect(tableReads.filter(r => r.table === 'assessment_options').every(r => r.client === 'service')).toBe(true)
    // Everything else stays on the user-scoped (RLS-enforcing) client.
    expect(tableReads.filter(r => r.client === 'service').map(r => r.table)).toEqual(['assessment_options'])
    expect(tableReads).toContainEqual({ client: 'user', table: 'coach_profiles' })
  })

  it('rejects an attempt that does not belong to the caller', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/admin/coach-dna')
  })

  it('rejects an attempt that is not yet completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('not completed')
  })

  it('persists and returns the summary on success', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.primaryType).toBe('teacher')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'coach-1',
        primary_profile_type: 'teacher',
      }),
      expect.objectContaining({ onConflict: 'user_id' }),
    )
  })

  it('uses the computed archetype slugs, not the slugs the model returned', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.pros.map(p => p.categorySlug)).toEqual(EXPECTED_PROS)
    expect(result.cons.map(c => c.categorySlug)).toEqual(EXPECTED_CONS)
    // The model's prose is kept, zipped on by position.
    expect(result.pros[0].text).toBe('You explain things well.')
    expect(result.cons[2].text).toBe('Say less, say it clearer.')

    const persisted = upsertMock.mock.calls[0][0]
    expect(persisted.ai_summary.pros.map(p => p.categorySlug)).toEqual(EXPECTED_PROS)
  })

  it('throws without persisting when the model returns the wrong number of pros', async () => {
    const parsed = JSON.parse(state.aiText)
    parsed.pros = parsed.pros.slice(0, 2)
    state.aiText = JSON.stringify(parsed)

    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('Could not generate your summary right now')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws without persisting when the model returns the wrong number of cons', async () => {
    const parsed = JSON.parse(state.aiText)
    parsed.cons = [...parsed.cons, { categorySlug: 'teacher', text: 'extra' }]
    state.aiText = JSON.stringify(parsed)

    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('Could not generate your summary right now')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws without persisting when Groq returns unparseable output', async () => {
    state.aiText = 'not json'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when the DB write fails', async () => {
    state.upsertError = { message: 'db down' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('db down')
  })

  it('throws without persisting when the responses read errors', async () => {
    state.responsesError = { message: 'connection reset' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('connection reset')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws without persisting when the options read errors', async () => {
    state.optionsError = { message: 'connection reset' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('connection reset')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when a response is missing its least-pick (pre-migration attempt)', async () => {
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: null }]

    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow(
      'This attempt was started before the current assessment format',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws without persisting when a completed attempt has no responses', async () => {
    state.responses = []
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws without persisting when the AI response is valid JSON but the wrong shape', async () => {
    state.aiText = JSON.stringify({ foo: 1 })
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws the friendly message without persisting on a genuine JSON syntax error', async () => {
    state.aiText = '{"a":}'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('Could not generate your summary right now')
    expect(upsertMock).not.toHaveBeenCalled()
  })
})
