// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    pros: { categorySlug: string; text: string }[]
    cons: { categorySlug: string; text: string; resources: unknown[] }[]
    sourcedCategories?: Record<string, string[]>
  } | null
  ensureFreshSummaryError: Error | null
} = {
  user: null,
  role: null,
  attempt: null,
  summary: null,
  ensureFreshSummaryError: null,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }) }) }
      if (table === 'assessment_attempts') return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const ensureFreshSummaryMock = vi.fn(async (_attemptId: string, _coachId: string) => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.summary
})
vi.mock('@/app/(app)/admin/coach-dna/summary-actions', () => ({
  ensureFreshSummary: (attemptId: string, coachId: string) => ensureFreshSummaryMock(attemptId, coachId),
}))

const loadGoogleFontMock = vi.fn(async (_family: string, _text: string) => new ArrayBuffer(8))
vi.mock('@/lib/coach-dna/google-font', () => ({
  loadGoogleFont: (family: string, text: string) => loadGoogleFontMock(family, text),
}))

const imageResponseMock = vi.fn((_el: unknown, opts: unknown) => new Response(null, { status: 200 }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(...args: [unknown, unknown]) {
      return imageResponseMock(...args)
    }
  },
}))

import { GET } from './route'

function makeRequest(attemptId: string) {
  return GET(new Request(`http://localhost/api/coach-dna/card-image/${attemptId}`), {
    params: Promise.resolve({ attemptId }),
  })
}

describe('GET /api/coach-dna/card-image/[attemptId]', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.summary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: '',
      pros: [{ categorySlug: 'communicator', text: '...' }],
      cons: [{ categorySlug: 'game-manager', text: '...', resources: [] }],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
    state.ensureFreshSummaryError = null
    ensureFreshSummaryMock.mockClear()
    imageResponseMock.mockClear()
    loadGoogleFontMock.mockClear()
    loadGoogleFontMock.mockImplementation(async () => new ArrayBuffer(8))
  })

  it('returns 401 when there is no authenticated user', async () => {
    state.user = null
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(401)
    expect(ensureFreshSummaryMock).not.toHaveBeenCalled()
  })

  it('returns 403 for a viewer role', async () => {
    state.role = 'viewer'
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(403)
  })

  it('returns 404 when the attempt does not belong to the caller', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
    expect(ensureFreshSummaryMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the attempt is not completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
  })

  it('returns 404 when the summary is not blended (self-only)', async () => {
    state.summary!.sourcedCategories = { motivator: ['self'] }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
    expect(imageResponseMock).not.toHaveBeenCalled()
  })

  it('generates a 1200x630 image with Barlow Condensed for a blended profile', async () => {
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(imageResponseMock).toHaveBeenCalledTimes(1)
    const opts = imageResponseMock.mock.calls[0][1] as { width: number; height: number; fonts: { name: string }[] }
    expect(opts.width).toBe(1200)
    expect(opts.height).toBe(630)
    expect(opts.fonts[0].name).toBe('Barlow Condensed')
    // ensureFreshSummary must always be called with the authenticated caller's
    // own id, never something derived from the attempt row -- a security-
    // critical argument (finding #7).
    expect(ensureFreshSummaryMock).toHaveBeenCalledWith('attempt-1', 'coach-1')
  })

  it('serves the image with a private, short-lived, revalidating cache header (not next/og\'s public/immutable default)', async () => {
    await makeRequest('attempt-1')
    const opts = imageResponseMock.mock.calls[0][1] as { headers?: Record<string, string> }
    expect(opts.headers?.['cache-control']).toBe('private, max-age=300, must-revalidate')
  })

  it('still returns 200 with the image rendered in the fallback font when loadGoogleFont fails', async () => {
    loadGoogleFontMock.mockRejectedValueOnce(new Error('fonts.googleapis.com timed out'))
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(imageResponseMock).toHaveBeenCalledTimes(1)
    const opts = imageResponseMock.mock.calls[0][1] as { fonts: unknown[] }
    expect(opts.fonts).toEqual([])
  })

  it('returns 500 when ensureFreshSummary throws', async () => {
    state.ensureFreshSummaryError = new Error('groq down')
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
})
