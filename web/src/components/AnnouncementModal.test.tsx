import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnnouncementModal } from './AnnouncementModal'

const dismissAnnouncementMock = vi.fn(async (_id: string) => ({}))

vi.mock('@/lib/announcements/actions', () => ({
  dismissAnnouncement: (id: string) => dismissAnnouncementMock(id),
}))

describe('AnnouncementModal', () => {
  beforeEach(() => {
    dismissAnnouncementMock.mockClear()
  })

  it('renders nothing when there is no announcement', () => {
    render(<AnnouncementModal announcement={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the message and a dismiss button when an announcement is given', () => {
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: null, linkLabel: null }} />)
    expect(screen.getByText('Try Coach DNA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('shows a link button using the given label and url', () => {
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: '/admin/coach-dna', linkLabel: 'Try it' }} />)
    const link = screen.getByRole('button', { name: 'Try it' })
    expect(link).toHaveAttribute('href', '/admin/coach-dna')
  })

  it('falls back to a default label when linkLabel is not given', () => {
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: '/admin/coach-dna', linkLabel: null }} />)
    expect(screen.getByRole('button', { name: 'Learn more' })).toBeInTheDocument()
  })

  it('does not show a link button when there is no link', () => {
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: null, linkLabel: null }} />)
    expect(screen.queryByRole('button', { name: 'Learn more' })).not.toBeInTheDocument()
  })

  it('dismisses the announcement and closes the dialog when Dismiss is clicked', async () => {
    const user = userEvent.setup()
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: null, linkLabel: null }} />)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(dismissAnnouncementMock).toHaveBeenCalledWith('ann-1')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('also dismisses the announcement when the link button is clicked, so it does not reappear', async () => {
    const user = userEvent.setup()
    render(<AnnouncementModal announcement={{ id: 'ann-1', message: 'Try Coach DNA', linkUrl: '/admin/coach-dna', linkLabel: 'Try it' }} />)

    await user.click(screen.getByRole('button', { name: 'Try it' }))

    expect(dismissAnnouncementMock).toHaveBeenCalledWith('ann-1')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
