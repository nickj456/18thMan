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
  blendInputs: Record<string, { source: string; responses: { value: number; submittedAt: string }[] }[]>
  cachedAiSummary: unknown
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
  blendInputs: {},
  cachedAiSummary: null,
}

const upsertMock = vi.fn(async (_row: { ai_summary: { categories: { categorySlug: string }[]; sourcedCategories: Record<string, string[]> } }, _opts?: unknown) => ({
  error: state.upsertError,
}))
const fetchBlendInputsMock = vi.fn(async (..._args: unknown[]) => state.blendInputs)
vi.mock('@/lib/coach-dna/blend-inputs', () => ({
  fetchBlendInputs: (...args: unknown[]) => fetchBlendInputsMock(...args),
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
let capturedModelId: string | undefined
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (modelId: string) => {
    capturedModelId = modelId
    return { modelId }
  },
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
        return {
          upsert: upsertMock,
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.cachedAiSummary ? { ai_summary: state.cachedAiSummary } : null }) }) }),
        }
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

import { generateSelfAssessmentSummary, ensureFreshSummary } from './summary-actions'
import { CATEGORY_RESOURCES } from '@/lib/coach-dna/resources'

// Derived from most option weighted 100 to `teacher` and least option weighted
// 100 to `motivator`: teacher scores high, motivator scores low, others tie at 0
// and fall back to CATEGORY_ORDER for tie-breaking.
const RANKED_SLUGS = ['teacher', 'technician', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder', 'motivator']
const RANKED_TIERS = ['strength', 'strength', 'strength', 'solid', 'solid', 'focus', 'focus', 'focus']

function categoryAiFixture() {
  // Deliberately bogus/wrong-case/empty categorySlugs on every entry: the
  // action must ignore them entirely and use the TypeScript-computed
  // archetype slugs (RANKED_SLUGS, in order) instead.
  return JSON.stringify({
    narrative: 'You lead with clarity and patience.',
    categories: [
      { categorySlug: 'Teacher', text: 'You explain things well.' },
      { categorySlug: 'nonsense', text: 'Your instruction is precise and repeatable.' },
      { categorySlug: '', text: 'You build players up steadily.' },
      { categorySlug: 'Game Manager', text: 'Your in-game reads are dependable.' },
      { categorySlug: 'nonsense', text: 'You keep sessions on track.' },
      { categorySlug: 'Organiser', text: 'Session structure could be tighter.' },
      { categorySlug: '', text: 'Set the tone more explicitly.' },
      { categorySlug: 'Motivator', text: 'Say less, say it clearer.' },
    ],
  })
}

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
    state.aiText = categoryAiFixture()
    state.upsertError = null
    state.blendInputs = {}
    state.cachedAiSummary = null
    upsertMock.mockClear()
    fetchBlendInputsMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/login')
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    const result = await generateSelfAssessmentSummary('attempt-1')
    expect(result.primaryType).toBe('teacher')
  })

  it('redirects non-coach, non-admin callers to the dashboard', async () => {
    state.role = 'viewer'
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

  it('never sends a deprecated/decommissioned Groq model id', async () => {
    // Regression test: Groq deprecated `llama-3.3-70b-versatile` (404
    // model_not_found), which broke every summary generation until fixed --
    // matches the same regression test already in src/app/api/chat/route.test.ts.
    await generateSelfAssessmentSummary('attempt-1')

    expect(capturedModelId).toBe('openai/gpt-oss-120b')
    expect(capturedModelId).not.toBe('llama-3.3-70b-versatile')
  })

  it('uses the computed archetype slugs, not the slugs the model returned', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.categories.map(c => c.categorySlug)).toEqual(RANKED_SLUGS)
    expect(result.categories.map(c => c.tier)).toEqual(RANKED_TIERS)
    // The model's prose is kept, zipped on by position.
    expect(result.categories[0].text).toBe('You explain things well.')
    expect(result.categories[7].text).toBe('Say less, say it clearer.')

    const persisted = upsertMock.mock.calls[0][0]
    expect(persisted.ai_summary.categories.map((c: { categorySlug: string }) => c.categorySlug)).toEqual(RANKED_SLUGS)
  })

  it('attaches the curated resources for each focus-tier category, never from the model, and none for strength/solid', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    // RANKED_SLUGS' focus tier (last 3): organiser, culture-builder, motivator
    const bySlug = (slug: string) => result.categories.find(c => c.categorySlug === slug)!
    expect(bySlug('organiser').resources).toEqual(CATEGORY_RESOURCES['organiser'])
    expect(bySlug('culture-builder').resources).toEqual(CATEGORY_RESOURCES['culture-builder'])
    expect(bySlug('motivator').resources).toEqual(CATEGORY_RESOURCES['motivator'])
    expect(bySlug('teacher').resources).toEqual([])
    expect(bySlug('game-manager').resources).toEqual([])
  })

  it('throws without persisting when the model returns the wrong number of categories', async () => {
    const parsed = JSON.parse(state.aiText)
    parsed.categories = parsed.categories.slice(0, 7)
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

  describe('feedback blend', () => {
    it('marks every category self-only when there is no external feedback', async () => {
      state.blendInputs = {}
      const result = await generateSelfAssessmentSummary('attempt-1')
      expect(result.sourcedCategories!.teacher).toEqual(['self'])
      expect(result.sourcedCategories!.motivator).toEqual(['self'])
      // Unchanged baseline behaviour from the self-only-only path.
      expect(result.primaryType).toBe('teacher')
    })

    it('calls fetchBlendInputs with the coach id', async () => {
      await generateSelfAssessmentSummary('attempt-1')
      expect(fetchBlendInputsMock).toHaveBeenCalledWith(expect.anything(), 'coach-1')
    })

    it('blends in a category once its external source clears the sample-size threshold', async () => {
      // getSourceThresholds default: player_voice threshold is 3.
      state.blendInputs = {
        motivator: [{ source: 'player_voice', responses: [
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        ] }],
      }
      const result = await generateSelfAssessmentSummary('attempt-1')
      expect(result.sourcedCategories!.motivator).toEqual(expect.arrayContaining(['self', 'player_voice']))
      // Every other category, untouched, stays self-only.
      expect(result.sourcedCategories!.teacher).toEqual(['self'])
    })

    it('does not blend a category whose external source is below the sample-size threshold', async () => {
      // Only 1 player_voice response -- below the threshold of 3.
      state.blendInputs = {
        motivator: [{ source: 'player_voice', responses: [{ value: 100, submittedAt: '2026-08-01T00:00:00.000Z' }] }],
      }
      const result = await generateSelfAssessmentSummary('attempt-1')
      expect(result.sourcedCategories!.motivator).toEqual(['self'])
    })

    it('persists sourcedCategories as part of ai_summary', async () => {
      state.blendInputs = {
        motivator: [{ source: 'player_voice', responses: [
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
          { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        ] }],
      }
      await generateSelfAssessmentSummary('attempt-1')
      const persisted = upsertMock.mock.calls[0][0]
      expect(persisted.ai_summary.sourcedCategories.motivator).toEqual(expect.arrayContaining(['self', 'player_voice']))
    })
  })
})

describe('ensureFreshSummary', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
    state.responsesError = null
    state.options = [
      { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
      { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
    ]
    state.optionsError = null
    state.aiText = categoryAiFixture()
    state.upsertError = null
    state.blendInputs = {}
    state.cachedAiSummary = null
    upsertMock.mockClear()
    fetchBlendInputsMock.mockClear()
  })

  it('throws when the attempt does not belong to the coach', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    await expect(ensureFreshSummary('attempt-1', 'coach-1')).rejects.toThrow()
  })

  it('throws when the attempt is not completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    await expect(ensureFreshSummary('attempt-1', 'coach-1')).rejects.toThrow()
  })

  it('generates and persists a new summary when nothing is cached yet', async () => {
    state.cachedAiSummary = null
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.primaryType).toBe('teacher')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('regenerates when the cached summary has a stale (pre-resources) shape', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'old',
      categories: [
        { categorySlug: 'teacher', score: 54, tier: 'strength', text: 'old' }, // missing `resources` -> stale shape
      ],
      sourcedCategories: { teacher: ['self'], motivator: ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('returns the cached summary without generating when sourcedCategories and archetype already match', async () => {
    // secondaryType: 'technician' here because with these fixture responses/options
    // teacher scores 54.17 and technician ties the next batch at 50 -- a <=10 gap,
    // so deriveArchetype assigns a secondaryType (see archetype.ts). Getting this
    // wrong would make the archetype-drift check (finding #3) falsely regenerate.
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: 'technician',
      narrative: 'cached narrative',
      categories: RANKED_SLUGS.map((categorySlug, i) => ({
        categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [],
      })),
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('cached narrative')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('regenerates when sourcedCategories match but the freshly computed primaryType has drifted', async () => {
    // sourcedCategories below are identical to what a fresh (self-only) computation
    // would produce here -- no category has crossed a blend threshold. But the
    // cached top-ranked category ('motivator') no longer matches what the self-scores
    // above (teacher scores highest) would compute -- e.g. because ongoing
    // self-only score drift moved the top category after the cache was written.
    // This must still trigger a regeneration, not a false "unchanged" match.
    state.cachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'cached narrative',
      categories: ['motivator', 'teacher', 'technician', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
        .map((categorySlug, i) => ({ categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [] })),
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('regenerates when new feedback has blended into a category the cache does not reflect', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'cached narrative',
      categories: RANKED_SLUGS.map((categorySlug, i) => ({
        categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [],
      })),
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    // New player_voice feedback clears the threshold for `motivator` -- the cache above doesn't reflect this yet.
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
      ] }],
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
