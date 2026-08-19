// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

/**
 * Regression test for the Groq model outage on 2026-08-18: Groq deprecated
 * `llama-3.3-70b-versatile` (404 model_not_found), which streamText threw on
 * for every request, silently killing the AI chat feature end-to-end.
 */

let capturedModelId: string | undefined

vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (modelId: string) => {
    capturedModelId = modelId
    return { modelId }
  },
}))

vi.mock('ai', () => ({
  streamText: (opts: { model: { modelId: string } }) => {
    capturedModelId = opts.model.modelId
    return {
      toUIMessageStreamResponse: () => new Response(null, { status: 200 }),
    }
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', email: 'coach@example.com' } } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) }
      }
      if (table === 'messages') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

vi.mock('@/lib/email', () => ({
  sendUpgradeNudgeEmail: async () => {},
}))

import { POST } from './route'

describe('POST /api/chat', () => {
  it('never sends a deprecated/decommissioned Groq model id', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Suggest a warm-up drill' }],
        conversationId: 'conv-1',
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(capturedModelId).toBe('openai/gpt-oss-120b')
    expect(capturedModelId).not.toBe('llama-3.3-70b-versatile')
  })
})
