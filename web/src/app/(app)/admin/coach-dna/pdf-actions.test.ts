// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email?: string } | null
  role: string | null
  summary: unknown
  sendResult: { success: boolean; error?: string }
} = { user: null, role: 'admin', summary: null, sendResult: { success: true } }

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
            eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }),
          }),
        }
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

  it('redirects non-admin callers to the dashboard', async () => {
    state.role = 'coach'
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/dashboard')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns an error when no summary exists yet', async () => {
    state.summary = null
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: 'No results to send yet.' })
    expect(sendEmailMock).not.toHaveBeenCalled()
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
