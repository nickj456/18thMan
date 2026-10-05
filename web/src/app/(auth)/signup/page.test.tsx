import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./actions', () => ({ signup: vi.fn() }))
vi.mock('../login/actions', () => ({ loginWithOAuth: vi.fn() }))

import SignupPage from './page'

async function renderPage(searchParams: { error?: string; success?: string; next?: string }) {
  render(await SignupPage({ searchParams: Promise.resolve(searchParams) }))
}

describe('SignupPage sign-in links', () => {
  it('carries next through to login', async () => {
    await renderPage({ next: '/coach-dna/feedback?tab=open' })
    expect(screen.getByRole('link', { name: /^Sign in$/ })).toHaveAttribute(
      'href',
      '/login?next=%2Fcoach-dna%2Ffeedback%3Ftab%3Dopen',
    )
  })

  it('falls back to plain /login without next', async () => {
    await renderPage({})
    expect(screen.getByRole('link', { name: /^Sign in$/ })).toHaveAttribute('href', '/login')
  })

  it('drops an unsafe next rather than passing it along', async () => {
    await renderPage({ next: '//evil.com' })
    expect(screen.getByRole('link', { name: /^Sign in$/ })).toHaveAttribute('href', '/login')
  })

  it('carries next on the check-email screen', async () => {
    await renderPage({ success: 'check-email', next: '/coach-dna' })
    expect(screen.getByRole('link', { name: /Sign in/ })).toHaveAttribute('href', '/login?next=%2Fcoach-dna')
  })

  it('links the check-email screen to plain /login without next', async () => {
    await renderPage({ success: 'check-email' })
    expect(screen.getByRole('link', { name: /Sign in/ })).toHaveAttribute('href', '/login')
  })
})
