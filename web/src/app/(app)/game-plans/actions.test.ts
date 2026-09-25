// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GROQ_TEXT_HEAVY, GROQ_CONDENSE, GROQ_NOTES_BUDGET_CHARS, DECOMMISSIONED_GROQ_MODELS,
} from '@/lib/ai/groq-models'

/**
 * Regression cover for the Groq input ceiling.
 *
 * Groq's on_demand tier rejects an oversized request outright with "Request
 * too large" rather than throttling it, so retrying never clears it. A coach
 * with long tactical notes could not generate a plan at all, and the error
 * told them to try again — advice that could not work.
 */

const VALID_PLAN = {
  teamFocus: { intro: 'Intro.', keyMessages: ['One', 'Two'] },
  forwards: { positions: 'Props', role: 'Go forward', points: ['A'] },
  backs: { positions: 'Wingers', role: 'Finish', points: ['B'] },
  halfBacks: { positions: 'Halves', role: 'Control', points: ['C'] },
  finalReminders: { closing: 'Close.', points: ['D'], quote: 'Quote' },
}

type Call = {
  model: { modelId: string }
  prompt?: string
  system?: string
  messages?: { role: string; content: string }[]
}

const state: {
  gamePlan: Record<string, unknown> | null
  generateImpl: (opts: Call) => Promise<{ text: string }>
  calls: Call[]
  updated: Record<string, unknown> | null
} = { gamePlan: null, generateImpl: async () => ({ text: '' }), calls: [], updated: null }

vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('next/navigation', () => ({ redirect: (p: string) => { throw new Error(`NEXT_REDIRECT:${p}`) } }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === 'profiles' ? { role: 'admin' } : state.gamePlan,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => { state.updated = values; return { error: null } },
      }),
    }),
  }),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (modelId: string) => ({ modelId }),
}))
vi.mock('ai', () => ({
  generateText: async (opts: Call) => { state.calls.push(opts); return state.generateImpl(opts) },
}))

import { generateGamePlan } from './actions'

/** Eight note fields of `each` characters, as the form would store them. */
function planWithNotes(each: number) {
  const text = 'Hold the line and communicate early in the middle third. '.repeat(200).slice(0, each)
  return {
    id: 'plan-1', opposition: 'Leigh East U14s', pitch: null, kick_off_time: null,
    detail_level: 'detailed', defence: text, attack: text, structure: text, aims: text,
    backs: text, forwards: text, half_backs: text, moves: text,
  }
}

beforeEach(() => {
  state.calls = []
  state.updated = null
  state.generateImpl = async () => ({ text: JSON.stringify(VALID_PLAN) })
})

describe('generateGamePlan — notes within budget', () => {
  it('generates directly, with no condense pass', async () => {
    state.gamePlan = planWithNotes(200)
    const res = await generateGamePlan('plan-1')

    expect(res.error).toBeUndefined()
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0].model.modelId).toBe(GROQ_TEXT_HEAVY)
    expect(state.updated?.status).toBe('generated')
  })
})

describe('generateGamePlan — notes over the Groq ceiling', () => {
  it('condenses the largest fields first, then generates', async () => {
    // 8 x 4858 = 38,864 chars: the shape that produced "Request too large".
    state.gamePlan = planWithNotes(4858)
    state.generateImpl = async (opts) =>
      opts.model.modelId === GROQ_CONDENSE
        ? { text: 'Condensed notes.' }
        : { text: JSON.stringify(VALID_PLAN) }

    const res = await generateGamePlan('plan-1')

    expect(res.error).toBeUndefined()
    const condenseCalls = state.calls.filter(c => c.model.modelId === GROQ_CONDENSE)
    const genCalls = state.calls.filter(c => c.model.modelId === GROQ_TEXT_HEAVY)

    expect(condenseCalls.length).toBeGreaterThan(0)
    expect(genCalls).toHaveLength(1)
    // Only what was needed: condensing every field would waste the token budget.
    expect(condenseCalls.length).toBeLessThan(8)

    const sent = genCalls[0].messages?.[0]?.content ?? ''
    expect(sent.length).toBeGreaterThan(0)
    expect(sent.length).toBeLessThanOrEqual(GROQ_NOTES_BUDGET_CHARS + 2000)
  })

  it('runs the condense pass on a different model from generation', async () => {
    // Each model id has its own rate-limit bucket. Condensing on the generation
    // model would spend the budget the generation request then needs.
    state.gamePlan = planWithNotes(4858)
    state.generateImpl = async (opts) =>
      opts.model.modelId === GROQ_CONDENSE
        ? { text: 'Condensed notes.' }
        : { text: JSON.stringify(VALID_PLAN) }

    await generateGamePlan('plan-1')

    expect(GROQ_CONDENSE).not.toBe(GROQ_TEXT_HEAVY)
    for (const call of state.calls) {
      expect(DECOMMISSIONED_GROQ_MODELS as readonly string[]).not.toContain(call.model.modelId)
    }
  })

  it('says the notes are too long rather than truncating them', async () => {
    // Condensing that returns the input unchanged cannot get under the ceiling.
    state.gamePlan = planWithNotes(4858)
    state.generateImpl = async (opts) =>
      opts.model.modelId === GROQ_CONDENSE
        ? { text: '' }                       // no saving
        : { text: JSON.stringify(VALID_PLAN) }

    const res = await generateGamePlan('plan-1')

    expect(res.error).toMatch(/too long to process/i)
    expect(res.error).toContain('38,864')
    expect(state.updated).toBeNull()
    expect(state.calls.some(c => c.model.modelId === GROQ_TEXT_HEAVY)).toBe(false)
  })
})

describe('generateGamePlan — failure messages', () => {
  it('never tells the coach to retry a request that is too large', async () => {
    state.gamePlan = planWithNotes(200)
    state.generateImpl = async () => {
      throw new Error('Request too large for model `openai/gpt-oss-120b` in organization `org_abc123` ... please reduce your message size')
    }

    const res = await generateGamePlan('plan-1')

    expect(res.error).toMatch(/too long to process in one go/i)
    expect(res.error).not.toMatch(/try again/i)
    // Provider text carries the org id; it must never reach the browser.
    expect(res.error).not.toContain('org_abc123')
  })

  it('does tell the coach to wait when the failure is a rate limit', async () => {
    state.gamePlan = planWithNotes(200)
    state.generateImpl = async () => {
      throw new Error('Rate limit reached for model `openai/gpt-oss-120b` in organization `org_abc123` on tokens per minute (TPM)')
    }

    const res = await generateGamePlan('plan-1')

    expect(res.error).toMatch(/busy/i)
    expect(res.error).not.toContain('org_abc123')
  })

  it('rejects a model response that does not match the plan shape', async () => {
    state.gamePlan = planWithNotes(200)
    state.generateImpl = async () => ({ text: JSON.stringify({ teamFocus: { intro: 'x' } }) })

    const res = await generateGamePlan('plan-1')

    expect(res.error).toBeTruthy()
    expect(state.updated).toBeNull()
  })
})
