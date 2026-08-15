// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

import { sendDirectEmailHtml, sendCoachDnaSummaryEmail, sendFeedbackThresholdReachedEmail } from './email'

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

  const summary = {
    primaryType: 'teacher',
    secondaryType: 'motivator',
    narrative: 'You lead with clarity.',
    pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
    cons: [{
      categorySlug: 'organiser',
      text: 'Sessions could run tighter. Try timeboxing each drill before you start.',
      resources: [{ title: 'Periodization Training for Sports', description: 'Structuring a season.', url: 'https://openlibrary.org/works/OL1850738W' }],
    }],
  }

  it('sends the PDF as an attachment to the coach\'s own email', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_456' }, error: null })
    const result = await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(result).toEqual({ success: true, messageId: 'msg_456' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      attachments: [{ filename: 'coach-dna-self-assessment.pdf', content: Buffer.from('fake-pdf') }],
    }))
  })

  it('includes the strengths and focus areas as feature lists in the email body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_789' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('You explain things well.'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Sessions could run tighter.'),
    }))
  })

  it('includes a CTA link back to the results page on-site', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_012' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('/admin/coach-dna'),
    }))
  })

  it('includes each focus area\'s curated resources in the email body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_345' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Periodization Training for Sports'),
    }))
  })

  it('renders no resource list when a focus area has no curated resources', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_678' }, error: null })
    const summaryWithoutResources = { ...summary, cons: [{ ...summary.cons[0], resources: [] }] }
    await sendCoachDnaSummaryEmail('coach@example.com', summaryWithoutResources, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('Periodization Training for Sports'),
    }))
  })

  it('renders a resource with no url as plain text, not a broken link', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_901' }, error: null })
    const summaryWithUnlinkedResource = {
      ...summary,
      cons: [{ ...summary.cons[0], resources: [{ title: 'RFL Coach Education', description: 'Coaching hub.', url: null }] }],
    }
    await sendCoachDnaSummaryEmail('coach@example.com', summaryWithUnlinkedResource, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('RFL Coach Education'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('<a href="null"'),
    }))
  })

  it('includes the self-only disclaimer when every category is self-only (including when sourcedCategories is absent)', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_222' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('This reflects your self-assessment only'),
    }))
  })

  it('omits the blanket disclaimer and tags the blended category once external feedback clears threshold', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_333' }, error: null })
    const blended = { ...summary, sourcedCategories: { teacher: ['self', 'player_voice'], organiser: ['self'] } }
    await sendCoachDnaSummaryEmail('coach@example.com', blended, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('This reflects your self-assessment only'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Includes player feedback'),
    }))
  })
})

describe('sendFeedbackThresholdReachedEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('sends to the coach with a subject naming the request type', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_555' }, error: null })
    const result = await sendFeedbackThresholdReachedEmail('coach@example.com', 'Alex', 'player_voice')
    expect(result).toEqual({ success: true, messageId: 'msg_555' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'coach@example.com' }))
  })

  it('includes a CTA link back to the feedback requests page', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_666' }, error: null })
    await sendFeedbackThresholdReachedEmail('coach@example.com', 'Alex', 'peer_observation')
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('/admin/coach-dna/feedback'),
    }))
  })
})
