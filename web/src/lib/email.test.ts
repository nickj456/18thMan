// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

import { sendDirectEmailHtml, sendCoachDnaSummaryEmail } from './email'

describe('sendDirectEmailHtml', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('returns an error when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY
    const result = await sendDirectEmailHtml('coach@example.com', 'Alex', 'Hi', '<p>Hello</p>')
    expect(result).toEqual({ success: false, error: 'RESEND_API_KEY not configured' })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends the email with the subject, recipient, and rendered HTML body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_123' }, error: null })
    const result = await sendDirectEmailHtml('coach@example.com', 'Alex', 'Welcome back', '<p>Great session!</p>')
    expect(result).toEqual({ success: true, messageId: 'msg_123' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      subject: 'Welcome back',
      html: expect.stringContaining('<p>Great session!</p>'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Alex'),
    }))
  })

  it('returns the Resend error message when the send fails', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'invalid recipient' } })
    const result = await sendDirectEmailHtml('bad@example.com', 'Alex', 'Hi', '<p>Hi</p>')
    expect(result).toEqual({ success: false, error: 'invalid recipient' })
  })
})

describe('sendCoachDnaSummaryEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('sends the PDF as an attachment to the coach\'s own email', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_456' }, error: null })
    const result = await sendCoachDnaSummaryEmail('coach@example.com', 'Teacher', Buffer.from('fake-pdf'))
    expect(result).toEqual({ success: true, messageId: 'msg_456' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      attachments: [{ filename: 'coach-dna-self-assessment.pdf', content: Buffer.from('fake-pdf') }],
    }))
  })
})
