import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  blendInputs: Record<string, { source: string; responses: { value: number; submittedAt: string }[] }[]>
} = { blendInputs: {} }

const fetchBlendInputsMock = vi.fn(async (..._args: unknown[]) => state.blendInputs)
vi.mock('./blend-inputs', () => ({
  fetchBlendInputs: (...args: unknown[]) => fetchBlendInputsMock(...args),
}))

import { computeBlendedArchetype } from './blended-archetype'

const RESPONSES = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
const OPTIONS = [
  { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
  { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
]
const COMPLETED_AT = '2026-08-06T00:00:00.000Z'

function makeSupabase(overrides: { responses?: unknown; responsesError?: { message: string } | null } = {}) {
  return {
    from: (table: string) => {
      if (table === 'assessment_responses') {
        return { select: () => ({ eq: async () => ({ data: overrides.responses ?? RESPONSES, error: overrides.responsesError ?? null }) }) }
      }
      throw new Error(`unexpected table on user client: ${table}`)
    },
  }
}

function makeServiceSupabase(overrides: { options?: unknown; optionsError?: { message: string } | null } = {}) {
  return {
    from: (table: string) => {
      if (table === 'assessment_options') {
        return { select: () => ({ in: async () => ({ data: overrides.options ?? OPTIONS, error: overrides.optionsError ?? null }) }) }
      }
      throw new Error(`unexpected table on service client: ${table}`)
    },
  }
}

describe('computeBlendedArchetype', () => {
  beforeEach(() => {
    state.blendInputs = {}
    fetchBlendInputsMock.mockClear()
  })

  it('throws when there are no responses', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      computeBlendedArchetype(makeSupabase({ responses: [] }) as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT),
    ).rejects.toThrow('No responses found for this completed attempt')
  })

  it('throws when a response is missing its least-pick', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase({ responses: [{ question_id: 'q1', selected_option: 'opt-1', least_option: null }] }) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase() as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('This attempt was started before the current assessment format')
  })

  it('propagates a responses read error', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase({ responsesError: { message: 'connection reset' } }) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase() as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('connection reset')
  })

  it('propagates an options read error', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase() as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase({ optionsError: { message: 'connection reset' } }) as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('connection reset')
  })

  it('marks every category self-only when there is no external feedback', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.archetype.primaryType).toBe('teacher')
    expect(result.sourcedCategories.teacher).toEqual(['self'])
    expect(result.sourcedCategories.motivator).toEqual(['self'])
  })

  it('calls fetchBlendInputs with the service client and coach id', async () => {
    const serviceSupabase = makeServiceSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await computeBlendedArchetype(makeSupabase() as any, serviceSupabase as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(fetchBlendInputsMock).toHaveBeenCalledWith(serviceSupabase, 'coach-1')
  })

  it('blends in a category once its external source clears the sample-size threshold', async () => {
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
      ] }],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.sourcedCategories.motivator).toEqual(expect.arrayContaining(['self', 'player_voice']))
    expect(result.sourcedCategories.teacher).toEqual(['self'])
  })

  it('does not blend a category whose external source is below the sample-size threshold', async () => {
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [{ value: 100, submittedAt: '2026-08-01T00:00:00.000Z' }] }],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.sourcedCategories.motivator).toEqual(['self'])
  })
})
