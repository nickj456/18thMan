// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email?: string } | null
  role: string | null
  displayName: string | null
  club: string | null
  clubId: string | null
  clubName: string | null
  summary: unknown
  sendResult: { success: boolean; error?: string }
} = { user: null, role: 'admin', displayName: null, club: null, clubId: null, clubName: null, summary: null, sendResult: { success: true } }

const sendEmailMock = vi.fn(async (..._args: unknown[]) => state.sendResult)
// renderToBuffer never actually invokes the component function it's handed —
// it just serializes the element tree — so to see what props CoachDnaSummaryPDF
// received we capture the element passed in here rather than mocking the
// component itself (which the real renderer never calls in this test setup).
const renderToBufferMock = vi.fn(async (_element: unknown) => new Uint8Array([1, 2, 3]))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (element: unknown) => renderToBufferMock(element),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
}))
vi.mock('@/lib/email', () => ({
  sendCoachDnaSummaryEmail: (...args: unknown[]) => sendEmailMock(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: state.role === null ? null : {
                  role: state.role,
                  display_name: state.displayName,
                  club: state.club,
                  club_id: state.clubId,
                },
              }),
            }),
          }),
        }
      }
      if (table === 'clubs') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.clubName ? { name: state.clubName } : null }) }) }) }
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.summary }) }) }) }
    },
  }),
}))

import { emailSelfAssessmentSummaryPDF } from './pdf-actions'

describe('emailSelfAssessmentSummaryPDF', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1', email: 'coach@example.com' }
    state.role = 'admin'
    state.displayName = null
    state.club = null
    state.clubId = null
    state.clubName = null
    state.summary = {
      ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] },
      ai_summary_generated_at: '2026-07-01T00:00:00.000Z',
    }
    state.sendResult = { success: true }
    sendEmailMock.mockClear()
    renderToBufferMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/login')
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: true })
  })

  it('redirects non-coach, non-admin callers to the dashboard', async () => {
    state.role = 'viewer'
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/dashboard')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns an error when no summary exists yet', async () => {
    state.summary = null
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: expect.stringContaining('refreshing') })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns an error and skips sending when the summary is legacy-shaped (missing resources on a con)', async () => {
    state.summary = {
      ai_summary: {
        primaryType: 'teacher',
        secondaryType: null,
        narrative: 'x',
        pros: [],
        cons: [{ categorySlug: 'communication', text: 'needs work' }],
      },
      ai_summary_generated_at: '2026-07-01T00:00:00.000Z',
    }
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: expect.stringContaining('refreshing') })
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(renderToBufferMock).not.toHaveBeenCalled()
  })

  it('sends the PDF to the caller\'s own account email', async () => {
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledWith(
      'coach@example.com',
      (state.summary as { ai_summary: unknown }).ai_summary,
      expect.any(Buffer),
    )
  })

  it('surfaces the email send failure', async () => {
    state.sendResult = { success: false, error: 'send failed' }
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: 'send failed' })
  })

  it('renders the PDF with the real completion timestamp, not render time', async () => {
    await emailSelfAssessmentSummaryPDF()

    expect(renderToBufferMock).toHaveBeenCalledTimes(1)
    const element = renderToBufferMock.mock.calls[0][0] as { props: { completedAt: string } }
    expect(element.props.completedAt).toBe('2026-07-01T00:00:00.000Z')
  })

  it('passes the coach\'s display name through to the PDF', async () => {
    state.displayName = 'Alex Coach'

    await emailSelfAssessmentSummaryPDF()

    const element = renderToBufferMock.mock.calls[0][0] as { props: { coachName: string | null } }
    expect(element.props.coachName).toBe('Alex Coach')
  })

  it('resolves the club name via club_id when the coach belongs to a club', async () => {
    state.clubId = 'club-1'
    state.clubName = 'Wigan Warriors'

    await emailSelfAssessmentSummaryPDF()

    const element = renderToBufferMock.mock.calls[0][0] as { props: { clubName: string | null } }
    expect(element.props.clubName).toBe('Wigan Warriors')
  })

  it('falls back to the legacy free-text club field when there is no club_id', async () => {
    state.clubId = null
    state.club = 'Legacy Club Name'

    await emailSelfAssessmentSummaryPDF()

    const element = renderToBufferMock.mock.calls[0][0] as { props: { clubName: string | null } }
    expect(element.props.clubName).toBe('Legacy Club Name')
  })

  it('passes a null club name when the coach has no club assigned', async () => {
    await emailSelfAssessmentSummaryPDF()

    const element = renderToBufferMock.mock.calls[0][0] as { props: { clubName: string | null } }
    expect(element.props.clubName).toBeNull()
  })

  it('falls back to the current time if ai_summary_generated_at is somehow missing', async () => {
    state.summary = {
      ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] },
      ai_summary_generated_at: null,
    }

    await emailSelfAssessmentSummaryPDF()

    const element = renderToBufferMock.mock.calls[0][0] as { props: { completedAt: string } }
    expect(element.props.completedAt).toEqual(expect.any(String))
    expect(() => new Date(element.props.completedAt).toISOString()).not.toThrow()
  })
})
