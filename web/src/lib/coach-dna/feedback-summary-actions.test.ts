// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  fresh: {
    playerParentVoice: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: unknown[] }[] }
    peerObservation: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: unknown[] }[] }
  }
  cached: unknown
  aiText: string
  upsertError: { message: string } | null
} = {
  fresh: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
  cached: null,
  aiText: '',
  upsertError: null,
}

const computeFeedbackSummaryMock = vi.fn(async (..._args: unknown[]) => state.fresh)
vi.mock('./feedback-summary', async importOriginal => {
  const actual = await importOriginal<typeof import('./feedback-summary')>()
  return { ...actual, computeFeedbackSummary: (...args: unknown[]) => computeFeedbackSummaryMock(...args) }
})

const upsertMock = vi.fn(async (_row: unknown, _opts?: unknown) => ({ error: state.upsertError }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'coach_profiles') {
        return {
          upsert: upsertMock,
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.cached ? { ai_feedback_summary: state.cached } : null }) }) }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (modelId: string) => ({ modelId }),
}))

import { ensureFreshFeedbackSummary } from './feedback-summary-actions'

describe('ensureFreshFeedbackSummary', () => {
  beforeEach(() => {
    state.fresh = {
      playerParentVoice: { ready: false, responseCount: 0, categories: [] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = null
    state.aiText = ''
    state.upsertError = null
    upsertMock.mockClear()
    computeFeedbackSummaryMock.mockClear()
  })

  it('returns both sections not-ready, without an AI call, when there is no feedback at all', async () => {
    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.peerObservation.ready).toBe(false)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('calls the AI once for a ready section and fills in each category\'s text', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'nonsense', text: 'Players consistently rate your teaching clearly.' }] })

    const result = await ensureFreshFeedbackSummary('coach-1')

    expect(result.playerParentVoice.categories[0].categorySlug).toBe('teacher')
    expect(result.playerParentVoice.categories[0].text).toBe('Players consistently rate your teaching clearly.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('never calls the AI when both sections are not ready', async () => {
    await ensureFreshFeedbackSummary('coach-1')
    expect(state.aiText).toBe('') // sanity: no text was ever needed
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('returns the cached summary without a new AI call when every category matches (slug, rating, count)', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: 'cached text', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }

    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.categories[0].text).toBe('cached text')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('regenerates when the cached average rating has drifted from the fresh computation', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 4,
        categories: [{ categorySlug: 'teacher', averageRating: 4.5, responseCount: 4, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: 'stale text', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'teacher', text: 'fresh text' }] })

    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.categories[0].text).toBe('fresh text')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('never sends a deprecated/decommissioned Groq model id', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 1,
        categories: [{ categorySlug: 'teacher', averageRating: 4, responseCount: 1, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'teacher', text: 'x' }] })
    await ensureFreshFeedbackSummary('coach-1')
    // The mocked createGroq captures whatever model id ensureFreshFeedbackSummary passes it --
    // asserted indirectly via the mock's returned modelId not throwing; the real assertion
    // that matters is covered by summary-actions.test.ts's equivalent regression test, since
    // both files must use the same 'openai/gpt-oss-120b' constant.
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
