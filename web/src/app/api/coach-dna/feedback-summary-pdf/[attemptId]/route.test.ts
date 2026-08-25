// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  displayName: string | null
  club: string | null
  clubId: string | null
  clubName: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    categories: unknown[]
    sourcedCategories?: Record<string, string[]>
  } | null
  ensureFreshSummaryError: Error | null
  feedbackSummary: unknown
} = {
  user: null, role: null, displayName: null, club: null, clubId: null, clubName: null,
  attempt: null, summary: null, ensureFreshSummaryError: null,
  feedbackSummary: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: state.role === null
                  ? null
                  : { role: state.role, display_name: state.displayName, club: state.club, club_id: state.clubId },
              }),
            }),
          }),
        }
      }
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'clubs') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: state.clubName ? { name: state.clubName } : null }) }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))

const ensureFreshSummaryMock = vi.fn(async (_attemptId: string, _coachId: string) => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.summary
})
vi.mock('@/app/(app)/admin/coach-dna/summary-actions', () => ({
  ensureFreshSummary: (attemptId: string, coachId: string) => ensureFreshSummaryMock(attemptId, coachId),
}))

const computeFeedbackSummaryMock = vi.fn(async (_supabase: unknown, _coachId: string) => state.feedbackSummary)
vi.mock('@/lib/coach-dna/feedback-summary', () => ({
  computeFeedbackSummary: (supabase: unknown, coachId: string) => computeFeedbackSummaryMock(supabase, coachId),
}))

const renderToBufferMock = vi.fn(async (_element: unknown) => new Uint8Array([1, 2, 3]))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (element: unknown) => renderToBufferMock(element),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  Image: 'Image',
}))

import { GET } from './route'

function makeRequest(attemptId: string) {
  return GET(new Request(`http://localhost/api/coach-dna/feedback-summary-pdf/${attemptId}`), {
    params: Promise.resolve({ attemptId }),
  })
}

describe('GET /api/coach-dna/feedback-summary-pdf/[attemptId]', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.displayName = null
    state.club = null
    state.clubId = null
    state.clubName = null
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.summary = {
      primaryType: 'motivator', secondaryType: null, narrative: '',
      categories: [], sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
    state.ensureFreshSummaryError = null
    state.feedbackSummary = {
      playerParentVoice: { ready: true, responseCount: 4, categories: [{ categorySlug: 'motivator', averageRating: 4.2, responseCount: 4 }] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    ensureFreshSummaryMock.mockClear()
    computeFeedbackSummaryMock.mockClear()
    renderToBufferMock.mockClear()
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
    expect(computeFeedbackSummaryMock).not.toHaveBeenCalled()
  })

  it('returns the PDF with the right headers for a blended profile', async () => {
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="coach-dna-feedback-summary.pdf"')
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)
  })

  it("calls computeFeedbackSummary with the authenticated caller's own id", async () => {
    await makeRequest('attempt-1')
    expect(computeFeedbackSummaryMock).toHaveBeenCalledWith(expect.anything(), 'coach-1')
  })

  it('passes the aggregated feedback summary data and club name through to the PDF', async () => {
    state.clubId = 'club-1'
    state.clubName = 'Wigan Warriors'

    await makeRequest('attempt-1')

    const element = renderToBufferMock.mock.calls[0][0] as { props: { data: unknown; clubName: string | null } }
    expect(element.props.data).toEqual(state.feedbackSummary)
    expect(element.props.clubName).toBe('Wigan Warriors')
  })

  it('returns 500 when computeFeedbackSummary throws', async () => {
    computeFeedbackSummaryMock.mockRejectedValueOnce(new Error('db down'))
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
})
