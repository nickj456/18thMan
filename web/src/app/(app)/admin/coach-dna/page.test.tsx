import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state: {
  user: { id: string } | null
  role: string | null
  inProgress: { id: string } | null
  completed: { id: string } | null
  aiSummary: unknown
  feedbackRequests: { id: string; feedback_type: string; minimum_response_threshold: number; status: string; expires_at: string }[]
  feedbackResponses: { id: string; feedback_request_id: string }[]
} = {
  user: null,
  role: null,
  inProgress: null,
  completed: null,
  aiSummary: null,
  feedbackRequests: [],
  feedbackResponses: [],
}

let assessmentAttemptCall = 0

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

function makeQuery(data: unknown, error: unknown = null) {
  const builder: {
    select: () => typeof builder
    eq: () => typeof builder
    is: () => typeof builder
    not: () => typeof builder
    order: () => typeof builder
    limit: () => typeof builder
    in: () => typeof builder
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>
    single: () => Promise<{ data: unknown; error: unknown }>
    then: (
      resolve: (v: { data: unknown; error: unknown }) => void,
      reject: (e: unknown) => void
    ) => Promise<void>
  } = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => builder,
    maybeSingle: async () => ({ data, error }),
    single: async () => ({ data, error }),
    then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
  }
  return builder
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
      if (table === 'profiles') return makeQuery({ role: state.role })
      if (table === 'assessment_attempts') {
        // Page queries in-progress first, completed second.
        assessmentAttemptCall += 1
        return makeQuery(assessmentAttemptCall === 1 ? state.inProgress : state.completed)
      }
      if (table === 'coach_profiles') return makeQuery({ ai_summary: state.aiSummary })
      if (table === 'feedback_requests') return makeQuery(state.feedbackRequests)
      if (table === 'feedback_responses') return makeQuery(state.feedbackResponses)
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import CoachDnaPage from './page'

describe('CoachDnaPage', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.inProgress = null
    state.completed = null
    state.aiSummary = null
    state.feedbackRequests = []
    state.feedbackResponses = []
    assessmentAttemptCall = 0
    redirectMock.mockClear()
  })

  it('shows the start CTA when no attempt exists', async () => {
    render(await CoachDnaPage())
    expect(screen.getByRole('button', { name: 'Start assessment' })).toBeInTheDocument()
  })

  it('shows the resume CTA when an attempt is in progress', async () => {
    state.inProgress = { id: 'attempt-1' }
    render(await CoachDnaPage())
    expect(screen.getByRole('button', { name: 'Resume assessment' })).toBeInTheDocument()
  })

  it('renders a condensed snapshot when completed with a valid summary', async () => {
    state.completed = { id: 'attempt-1' }
    state.aiSummary = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
    }

    render(await CoachDnaPage())

    expect(screen.getByText(/You're a Motivator \/ Technician coach/)).toBeInTheDocument()
    expect(screen.getByText(/Communicator/)).toBeInTheDocument()
    expect(screen.getByText(/Game Manager/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View full breakdown' })).toHaveAttribute(
      'href',
      '/admin/coach-dna/assessment/attempt-1/complete'
    )
  })

  it('falls back to the plain results button when no valid summary has been generated yet', async () => {
    state.completed = { id: 'attempt-1' }
    state.aiSummary = null

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View your results' })).toBeInTheDocument()
  })

  it('falls back to the plain results button for a stale summary shape', async () => {
    state.completed = { id: 'attempt-1' }
    // Missing `resources` on cons marks this as a pre-growth-resources shape.
    state.aiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: '',
      pros: [],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management' }],
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View your results' })).toBeInTheDocument()
  })

  it('shows the empty-state CTA when there are no feedback requests', async () => {
    render(await CoachDnaPage())
    expect(screen.getByRole('button', { name: 'View feedback requests' })).toBeInTheDocument()
  })

  it('shows an expired notice when every request has expired', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 5, status: 'expired', expires_at: PAST },
    ]

    render(await CoachDnaPage())

    expect(screen.getByText(/1 feedback request has expired/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View feedback requests' })).toBeInTheDocument()
  })

  it('shows an aggregate progress bar and per-type breakdown for active requests', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'active', expires_at: FUTURE },
      { id: 'req-2', feedback_type: 'peer_observation', minimum_response_threshold: 4, status: 'active', expires_at: FUTURE },
    ]
    state.feedbackResponses = [
      { id: 'resp-1', feedback_request_id: 'req-1' },
      { id: 'resp-2', feedback_request_id: 'req-1' },
      { id: 'resp-3', feedback_request_id: 'req-1' },
      { id: 'resp-4', feedback_request_id: 'req-1' },
      { id: 'resp-5', feedback_request_id: 'req-2' },
      { id: 'resp-6', feedback_request_id: 'req-2' },
    ]

    render(await CoachDnaPage())

    expect(screen.getByText('6 of 12 responses received')).toBeInTheDocument()
    expect(screen.getByText(/Player \/ Parent Voice/)).toBeInTheDocument()
    expect(screen.getByText(/Peer Observation/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View feedback requests' })).toHaveAttribute(
      'href',
      '/admin/coach-dna/feedback'
    )
  })

  it('excludes expired requests from the aggregate but keeps active ones', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'expired', expires_at: PAST },
      { id: 'req-2', feedback_type: 'peer_observation', minimum_response_threshold: 4, status: 'active', expires_at: FUTURE },
    ]
    state.feedbackResponses = [{ id: 'resp-1', feedback_request_id: 'req-2' }]

    render(await CoachDnaPage())

    expect(screen.getByText('1 of 4 responses received')).toBeInTheDocument()
  })

  it('treats a request as expired once expires_at has passed even if status still says active', async () => {
    // The `status` column can lag reality until a background job flips it —
    // feedbackRequestEligibility() is the source of truth, keyed off expires_at.
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'active', expires_at: PAST },
      { id: 'req-2', feedback_type: 'peer_observation', minimum_response_threshold: 4, status: 'active', expires_at: FUTURE },
    ]
    state.feedbackResponses = [{ id: 'resp-1', feedback_request_id: 'req-2' }]

    render(await CoachDnaPage())

    expect(screen.getByText('1 of 4 responses received')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', async () => {
    state.user = null
    await expect(CoachDnaPage()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects non-admin, non-coach roles to the dashboard', async () => {
    state.role = 'viewer'
    await expect(CoachDnaPage()).rejects.toThrow('REDIRECT:/dashboard')
  })
})
