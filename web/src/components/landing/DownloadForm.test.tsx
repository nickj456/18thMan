import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DownloadForm } from './DownloadForm'

describe('DownloadForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders visible labels for both fields and an enabled submit button', () => {
    render(<DownloadForm />)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Age group')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send me the plan/i })).toBeEnabled()
  })

  it('shows the success state after a successful submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))
    const user = userEvent.setup()
    render(<DownloadForm />)

    await user.type(screen.getByPlaceholderText('you@club.com'), 'coach@club.com')
    await user.click(screen.getByRole('button', { name: /send me the plan/i }))

    expect(await screen.findByText('Check your inbox.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/leads/session-plan', expect.objectContaining({ method: 'POST' }))
  })

  it('shows the API error message when the request is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'That email looks invalid.' }),
    }))
    const user = userEvent.setup()
    render(<DownloadForm />)

    await user.type(screen.getByPlaceholderText('you@club.com'), 'coach@club.com')
    await user.click(screen.getByRole('button', { name: /send me the plan/i }))

    expect(await screen.findByText('That email looks invalid.')).toBeInTheDocument()
  })
})
