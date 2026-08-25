import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state: {
  user: { id: string } | null
  role: string | null
  inProgress: { id: string } | null
  completed: { id: string } | null
  ensureFreshSummaryResult: unknown
  ensureFreshSummaryError: Error | null
  fallbackCachedAiSummary: unknown
  feedbackRequests: { id: string; feedback_type: string; minimum_response_threshold: number; status: string; expires_at: string }[]
  feedbackResponses: { id: string; feedback_request_id: string; submitted_at?: string }[]
  feedbackAnswers: { feedback_response_id: string; written_value: string | null }[]
} = {
  user: null,
  role: null,
  inProgress: null,
  completed: null,
  ensureFreshSummaryResult: null,
  ensureFreshSummaryError: null,
  fallbackCachedAiSummary: null,
  feedbackRequests: [],
  feedbackResponses: [],
  feedbackAnswers: [],
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
  unstable_rethrow: () => {},
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
      if (table === 'coach_profiles') return makeQuery({ ai_summary: state.fallbackCachedAiSummary })
      if (table === 'feedback_requests') return makeQuery(state.feedbackRequests)
      if (table === 'feedback_responses') return makeQuery(state.feedbackResponses)
      if (table === 'feedback_answers') return makeQuery(state.feedbackAnswers)
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const ensureFreshSummaryMock = vi.fn(async (_attemptId: string, _coachId: string) => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.ensureFreshSummaryResult
})
vi.mock('./summary-actions', () => ({
  ensureFreshSummary: (attemptId: string, coachId: string) => ensureFreshSummaryMock(attemptId, coachId),
  startAssessment: () => {
    throw new Error('startAssessment should not be called by these tests')
  },
}))

import CoachDnaPage from './page'

describe('CoachDnaPage', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.inProgress = null
    state.completed = null
    state.ensureFreshSummaryResult = null
    state.ensureFreshSummaryError = null
    state.fallbackCachedAiSummary = null
    state.feedbackRequests = []
    state.feedbackResponses = []
    state.feedbackAnswers = []
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
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByText(/You're a Motivator \/ Technician coach/)).toBeInTheDocument()
    expect(screen.getByText(/Communicator/)).toBeInTheDocument()
    expect(screen.getByText(/Game Manager/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View full breakdown' })).toHaveAttribute(
      'href',
      '/admin/coach-dna/assessment/attempt-1/complete'
    )
    // ensureFreshSummary must always be called with the authenticated caller's
    // own id (user.id), never e.g. attempt.coach_id -- a security-critical
    // argument (finding #7).
    expect(ensureFreshSummaryMock).toHaveBeenCalledWith('attempt-1', 'coach-1')
  })

  it('shows the outcome reveal trigger when feedback has blended in', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: /Download your Coach DNA report/ })).toBeInTheDocument()
  })

  it('shows a link to the feedback breakdown page once feedback has blended in', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('link', { name: 'View feedback breakdown' })).toHaveAttribute(
      'href',
      '/admin/coach-dna/feedback/summary',
    )
  })

  it('hides the feedback breakdown link for a self-only summary', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.queryByRole('link', { name: 'View feedback breakdown' })).not.toBeInTheDocument()
  })

  it('hides the outcome reveal trigger for a self-only summary', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.queryByRole('button', { name: /Download your Coach DNA report/ })).not.toBeInTheDocument()
  })

  it('still shows the outcome reveal trigger off a fallback-cached summary that is itself already blended', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    state.fallbackCachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'Cached narrative.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByText(/You're a Motivator coach/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download your Coach DNA report/ })).toBeInTheDocument()
  })

  it('falls back to the plain results button when ensureFreshSummary fails and nothing valid is cached', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    state.fallbackCachedAiSummary = null

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View your results' })).toBeInTheDocument()
  })

  it('falls back to the plain results button when ensureFreshSummary fails and the cached fallback has a stale shape', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    // Missing `resources` on the category marks this as a pre-growth-resources shape --
    // the fallback branch's own isCurrentSummaryShape check must reject it too.
    state.fallbackCachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: '',
      categories: [{ categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management' }],
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

  it('shows the most recent written comment when one exists', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'active', expires_at: FUTURE },
    ]
    // Mock query ordering isn't real (makeQuery ignores .order()), so the
    // fixture is listed already in the desired most-recent-first order.
    state.feedbackResponses = [
      { id: 'resp-2', feedback_request_id: 'req-1', submitted_at: '2026-08-15T00:00:00.000Z' },
      { id: 'resp-1', feedback_request_id: 'req-1', submitted_at: '2026-08-01T00:00:00.000Z' },
    ]
    state.feedbackAnswers = [
      { feedback_response_id: 'resp-1', written_value: 'An older comment.' },
      { feedback_response_id: 'resp-2', written_value: 'Really clear communicator, sessions feel well organised.' },
    ]

    render(await CoachDnaPage())

    expect(screen.getByText('Really clear communicator, sessions feel well organised.')).toBeInTheDocument()
  })

  it('truncates an overly long comment with an ellipsis', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'active', expires_at: FUTURE },
    ]
    state.feedbackResponses = [{ id: 'resp-1', feedback_request_id: 'req-1', submitted_at: '2026-08-15T00:00:00.000Z' }]
    state.feedbackAnswers = [{ feedback_response_id: 'resp-1', written_value: 'x'.repeat(300) }]

    render(await CoachDnaPage())

    expect(screen.getByText(`${'x'.repeat(220)}…`)).toBeInTheDocument()
  })

  it('shows no comment block when no response has a written comment', async () => {
    state.feedbackRequests = [
      { id: 'req-1', feedback_type: 'player_voice', minimum_response_threshold: 8, status: 'active', expires_at: FUTURE },
    ]
    state.feedbackResponses = [{ id: 'resp-1', feedback_request_id: 'req-1', submitted_at: '2026-08-15T00:00:00.000Z' }]
    state.feedbackAnswers = [{ feedback_response_id: 'resp-1', written_value: null }]

    render(await CoachDnaPage())

    expect(screen.getByText('1 of 8 responses received')).toBeInTheDocument()
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
