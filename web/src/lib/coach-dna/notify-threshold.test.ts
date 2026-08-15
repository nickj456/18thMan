// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  request: { coach_id: string; feedback_type: string; minimum_response_threshold: number } | null
  clearedCount: number | null
  authUser: { email: string } | null
  profile: { display_name: string | null; username: string } | null
} = {
  request: null,
  clearedCount: null,
  authUser: null,
  profile: null,
}

const sendEmailMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/email', () => ({
  sendFeedbackThresholdReachedEmail: (...args: unknown[]) => sendEmailMock(...args),
}))

function makeClient() {
  return {
    auth: { admin: { getUserById: async () => ({ data: { user: state.authUser } }) } },
    from: (table: string) => {
      if (table === 'feedback_requests') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.request }) }) }) }
      }
      if (table === 'feedback_responses') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ count: state.clearedCount }) }) }) }
      }
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.profile }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }
}

import { notifyIfThresholdJustReached } from './notify-threshold'

describe('notifyIfThresholdJustReached', () => {
  beforeEach(() => {
    state.request = { coach_id: 'coach-1', feedback_type: 'player_voice', minimum_response_threshold: 3 }
    state.clearedCount = 3
    state.authUser = { email: 'coach@example.com' }
    state.profile = { display_name: 'Alex', username: 'alexcoach' }
    sendEmailMock.mockClear()
  })

  it('sends when the cleared count exactly equals the threshold', async () => {
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).toHaveBeenCalledWith('coach@example.com', 'Alex', 'player_voice')
  })

  it('does not send when the count is below the threshold', async () => {
    state.clearedCount = 2
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send again once the count has already passed the threshold', async () => {
    state.clearedCount = 4
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('falls back to username when display_name is null', async () => {
    state.profile = { display_name: null, username: 'alexcoach' }
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).toHaveBeenCalledWith('coach@example.com', 'alexcoach', 'player_voice')
  })

  it('does nothing when the request cannot be found', async () => {
    state.request = null
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does nothing when the coach has no resolvable email', async () => {
    state.authUser = null
    await notifyIfThresholdJustReached(makeClient() as never, 'req-1')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('never throws -- swallows an unexpected error so the caller\'s own success path is not blocked', async () => {
    const throwingClient = {
      auth: { admin: { getUserById: async () => { throw new Error('boom') } } },
      from: makeClient().from,
    }
    await expect(notifyIfThresholdJustReached(throwingClient as never, 'req-1')).resolves.toBeUndefined()
  })
})
