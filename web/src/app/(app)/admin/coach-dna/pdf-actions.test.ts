// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email?: string } | null
  summary: unknown
  sendResult: { success: boolean; error?: string }
} = { user: null, summary: null, sendResult: { success: true } }

const sendEmailMock = vi.fn(async (..._args: unknown[]) => state.sendResult)

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: async () => new Uint8Array([1, 2, 3]),
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
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.summary }) }) }),
    }),
  }),
}))

import { emailSelfAssessmentSummaryPDF } from './pdf-actions'

describe('emailSelfAssessmentSummaryPDF', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1', email: 'coach@example.com' }
    state.summary = { ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] } }
    state.sendResult = { success: true }
    sendEmailMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/login')
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
    expect(sendEmailMock).toHaveBeenCalledWith('coach@example.com', 'teacher', expect.any(Buffer))
  })

  it('surfaces the email send failure', async () => {
    state.sendResult = { success: false, error: 'send failed' }
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: 'send failed' })
  })
})
