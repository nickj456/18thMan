// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  aiText: string
} = { user: null, role: null, aiText: '{}' }

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    // Mirrors Next's real behavior: redirect() throws a control-flow error.
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { role: state.role } }) }),
      }),
    }),
  }),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => () => 'mock-model',
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))

import { generatePosts } from './actions'

describe('generatePosts', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.aiText = '{"x":"post"}'
  })

  it('redirects unauthenticated callers instead of returning an error object', async () => {
    state.user = null
    await expect(generatePosts('topic', 'tip', ['x'])).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('redirects non-admins instead of swallowing the redirect (regression)', async () => {
    state.role = 'coach'
    await expect(generatePosts('topic', 'tip', ['x'])).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })

  it('rejects empty input and unknown-only platform lists', async () => {
    expect(await generatePosts('   ', 'tip', ['x'])).toEqual({ error: 'Add some content first.' })
    expect(await generatePosts('topic', 'tip', ['myspace'])).toEqual({ error: 'Select at least one platform.' })
  })

  it('extracts JSON wrapped in model prose via brace slicing', async () => {
    state.aiText = 'Here are your posts:\n{"x":"Short one.","facebook":"Longer one."}\nEnjoy!'
    expect(await generatePosts('topic', 'tip', ['x', 'facebook'])).toEqual({
      posts: { x: 'Short one.', facebook: 'Longer one.' },
    })
  })

  it('returns a generic error (no internals leaked) when the model output has no JSON', async () => {
    state.aiText = 'Sorry, I cannot help with that.'
    expect(await generatePosts('topic', 'tip', ['x'])).toEqual({
      error: 'Generation failed. Please try again.',
    })
  })
})
