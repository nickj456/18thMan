import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state: {
  user: { id: string } | null
  role: string | null
  feedbackSummary: {
    playerParentVoice: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: { title: string; description: string; url: string | null }[] }[] }
    peerObservation: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: { title: string; description: string; url: string | null }[] }[] }
  }
} = {
  user: null,
  role: null,
  feedbackSummary: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
}

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
const ensureFreshFeedbackSummaryMock = vi.fn(async (_coachId: string) => state.feedbackSummary)
vi.mock('@/lib/coach-dna/feedback-summary-actions', () => ({
  ensureFreshFeedbackSummary: (coachId: string) => ensureFreshFeedbackSummaryMock(coachId),
}))

import FeedbackSummaryPage from './page'

describe('FeedbackSummaryPage', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.feedbackSummary = {
      playerParentVoice: { ready: false, responseCount: 0, categories: [] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    redirectMock.mockClear()
    ensureFreshFeedbackSummaryMock.mockClear()
  })

  it('redirects unauthenticated users to login', async () => {
    state.user = null
    await expect(FeedbackSummaryPage()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects non-admin, non-coach roles to the dashboard', async () => {
    state.role = 'viewer'
    await expect(FeedbackSummaryPage()).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('shows a not-ready message for a section with no cleared responses', async () => {
    render(await FeedbackSummaryPage())
    expect(screen.getAllByText(/Not enough responses yet/)).toHaveLength(2)
  })

  it('renders a ready section\'s categories with band, rating, and AI text', async () => {
    state.feedbackSummary = {
      playerParentVoice: {
        ready: true, responseCount: 4,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 4, text: 'Players consistently rate your teaching clearly.', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    render(await FeedbackSummaryPage())
    expect(screen.getByText('Teacher')).toBeInTheDocument()
    expect(screen.getByText(/Strong/)).toBeInTheDocument()
    expect(screen.getByText('Players consistently rate your teaching clearly.')).toBeInTheDocument()
  })

  it('renders clickable resource links for a below-threshold category', async () => {
    state.feedbackSummary = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{
          categorySlug: 'organiser', averageRating: 2.5, responseCount: 3, text: 'Sessions could run tighter.',
          resources: [{ title: 'Periodization Training for Sports', description: 'Structuring a season.', url: 'https://openlibrary.org/works/OL1850738W' }],
        }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    render(await FeedbackSummaryPage())
    const link = screen.getByRole('link', { name: 'Periodization Training for Sports' })
    expect(link).toHaveAttribute('href', 'https://openlibrary.org/works/OL1850738W')
  })

  it('always calls ensureFreshFeedbackSummary with the authenticated caller\'s own id', async () => {
    await FeedbackSummaryPage()
    expect(ensureFreshFeedbackSummaryMock).toHaveBeenCalledWith('coach-1')
  })
})
