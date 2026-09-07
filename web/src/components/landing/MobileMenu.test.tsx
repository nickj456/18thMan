import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileMenu } from './MobileMenu'

describe('MobileMenu', () => {
  it('starts closed and opens the panel with all section links', async () => {
    const user = userEvent.setup()
    render(<MobileMenu signedIn={false} />)

    expect(screen.queryByText('Platform')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    for (const label of ['Platform', 'How it works', 'Pricing', 'Coaching Eye']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Sign in when signed out and Go to dashboard when signed in', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MobileMenu signedIn={false} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByText('Sign in')).toBeInTheDocument()

    rerender(<MobileMenu signedIn={true} />)
    expect(screen.getByText('Go to dashboard →')).toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('closes the panel when a section link is clicked', async () => {
    const user = userEvent.setup()
    render(<MobileMenu signedIn={false} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByText('Platform'))

    expect(screen.queryByText('Pricing')).not.toBeInTheDocument()
  })
})
