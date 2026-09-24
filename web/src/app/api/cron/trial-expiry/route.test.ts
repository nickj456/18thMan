// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Filter = [op: string, column: string, value: unknown]
type Row = { id: string; display_name: string | null; trial_ends_at: string }

const state: {
  warnRows: Row[]
  expiredRows: Row[]
  emails: Record<string, string | undefined>
  tiers: Record<string, string>
  warnResult: { success: boolean }
  expiredResult: { success: boolean }
} = { warnRows: [], expiredRows: [], emails: {}, tiers: {}, warnResult: { success: true }, expiredResult: { success: true } }

const selects: Filter[][] = []
const updates: { values: Record<string, unknown>; id: unknown }[] = []
const sendWarning = vi.fn(async () => state.warnResult)
const sendExpired = vi.fn(async () => state.expiredResult)

// Chainable stand-in for the Supabase query builder: records every filter,
// then resolves to the warning or expired rows depending on which
// "email already sent" column the query checks.
function selectBuilder() {
  const filters: Filter[] = []
  selects.push(filters)
  const builder = {
    not: (column: string, op: string, value: unknown) => (filters.push([`not.${op}`, column, value]), builder),
    gt: (column: string, value: unknown) => (filters.push(['gt', column, value]), builder),
    gte: (column: string, value: unknown) => (filters.push(['gte', column, value]), builder),
    lte: (column: string, value: unknown) => (filters.push(['lte', column, value]), builder),
    is: (column: string, value: unknown) => (filters.push(['is', column, value]), builder),
    then: (resolve: (r: { data: Row[]; error: null }) => unknown) => {
      const isWarning = filters.some(([op, col]) => op === 'is' && col === 'trial_warning_sent_at')
      return Promise.resolve({ data: isWarning ? state.warnRows : state.expiredRows, error: null }).then(resolve)
    },
  }
  return builder
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => selectBuilder(),
      update: (values: Record<string, unknown>) => ({
        eq: async (_col: string, id: unknown) => {
          updates.push({ values, id })
          return {}
        },
      }),
    }),
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: state.emails[id] ? { email: state.emails[id] } : null } }),
      },
    },
  }),
}))
vi.mock('@/lib/subscription', () => ({
  getEffectiveTier: async (_client: unknown, id: string) => state.tiers[id] ?? 'free',
}))
vi.mock('@/lib/email', () => ({
  sendTrialExpiryWarningEmail: (...args: unknown[]) => sendWarning(...(args as [])),
  sendTrialExpiredEmail: (...args: unknown[]) => sendExpired(...(args as [])),
}))

import { GET } from './route'

const NOW = new Date('2026-09-25T00:00:00.000Z')
const HOUR = 60 * 60 * 1000

function request(auth = 'Bearer test-secret') {
  return new Request('https://18thman.app/api/cron/trial-expiry', { headers: { authorization: auth } })
}

function filtersFor(sentColumn: string): Filter[] {
  const found = selects.find(f => f.some(([op, col]) => op === 'is' && col === sentColumn))
  if (!found) throw new Error(`no query checked ${sentColumn}`)
  return found
}

describe('GET /api/cron/trial-expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    process.env.CRON_SECRET = 'test-secret'
    state.warnRows = []
    state.expiredRows = []
    state.emails = {}
    state.tiers = { u1: 'trial', u2: 'free' }
    state.warnResult = { success: true }
    state.expiredResult = { success: true }
    selects.length = 0
    updates.length = 0
    sendWarning.mockClear()
    sendExpired.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 without the cron secret', async () => {
    const res = await GET(request('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(selects).toHaveLength(0)
  })

  // Regression: the job runs once a day (vercel.json), but it used to only
  // look at a 1-hour window, so a trial ending at e.g. 16:27 was never warned.
  it('warns every trial ending within the next 24 hours that has not been warned yet', async () => {
    await GET(request())
    expect(filtersFor('trial_warning_sent_at')).toEqual(
      expect.arrayContaining([
        ['gt', 'trial_ends_at', NOW.toISOString()],
        ['lte', 'trial_ends_at', new Date(NOW.getTime() + 24 * HOUR).toISOString()],
        ['is', 'trial_warning_sent_at', null],
      ]),
    )
  })

  // Regression: same bug — only trials that ended in the hour before the
  // midnight run ever got the expired email.
  it('emails every trial that ended in the last 48 hours and has not been emailed yet', async () => {
    await GET(request())
    expect(filtersFor('trial_expired_email_sent_at')).toEqual(
      expect.arrayContaining([
        ['lte', 'trial_ends_at', NOW.toISOString()],
        ['gt', 'trial_ends_at', new Date(NOW.getTime() - 48 * HOUR).toISOString()],
        ['is', 'trial_expired_email_sent_at', null],
      ]),
    )
  })

  it('sends the warning and records it so the next run does not resend', async () => {
    state.warnRows = [{ id: 'u1', display_name: 'Ed', trial_ends_at: '2026-09-25T16:27:00.000Z' }]
    state.emails = { u1: 'ed@example.com' }
    const res = await GET(request())
    expect(sendWarning).toHaveBeenCalledWith('ed@example.com', 'Ed')
    expect(updates).toEqual([{ values: { trial_warning_sent_at: NOW.toISOString() }, id: 'u1' }])
    expect(await res.json()).toMatchObject({ warned: 1, expired: 0 })
  })

  it('does not record the warning when the send fails, so the next run retries', async () => {
    state.warnRows = [{ id: 'u1', display_name: 'Ed', trial_ends_at: '2026-09-25T16:27:00.000Z' }]
    state.emails = { u1: 'ed@example.com' }
    state.warnResult = { success: false }
    const res = await GET(request())
    expect(updates).toEqual([])
    expect(await res.json()).toMatchObject({ warned: 0 })
  })

  it('sends the expired email and records it so the next run does not resend', async () => {
    state.expiredRows = [{ id: 'u2', display_name: null, trial_ends_at: '2026-09-24T09:35:00.000Z' }]
    state.emails = { u2: 'lew@example.com' }
    const res = await GET(request())
    expect(sendExpired).toHaveBeenCalledWith('lew@example.com', '')
    expect(updates).toEqual([{ values: { trial_expired_email_sent_at: NOW.toISOString() }, id: 'u2' }])
    expect(await res.json()).toMatchObject({ warned: 0, expired: 1 })
  })

  it('does not record the expired email when the send fails, so the next run retries', async () => {
    state.expiredRows = [{ id: 'u2', display_name: null, trial_ends_at: '2026-09-24T09:35:00.000Z' }]
    state.emails = { u2: 'lew@example.com' }
    state.expiredResult = { success: false }
    const res = await GET(request())
    expect(updates).toEqual([])
    expect(await res.json()).toMatchObject({ expired: 0 })
  })

  it('does not warn a coach who has already paid during their trial', async () => {
    state.warnRows = [{ id: 'u1', display_name: 'Ed', trial_ends_at: '2026-09-25T16:27:00.000Z' }]
    state.emails = { u1: 'ed@example.com' }
    state.tiers = { u1: 'coach' }
    await GET(request())
    expect(sendWarning).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('does not send the trial-ended email to a coach who has since paid or joined a paid club', async () => {
    state.expiredRows = [
      { id: 'u2', display_name: null, trial_ends_at: '2026-09-24T09:35:00.000Z' },
      { id: 'u3', display_name: null, trial_ends_at: '2026-09-24T09:35:00.000Z' },
    ]
    state.emails = { u2: 'lew@example.com', u3: 'win@example.com' }
    state.tiers = { u2: 'coach', u3: 'club' }
    await GET(request())
    expect(sendExpired).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('skips users with no email address', async () => {
    state.warnRows = [{ id: 'u1', display_name: 'Ed', trial_ends_at: '2026-09-25T16:27:00.000Z' }]
    state.expiredRows = [{ id: 'u2', display_name: null, trial_ends_at: '2026-09-24T09:35:00.000Z' }]
    await GET(request())
    expect(sendWarning).not.toHaveBeenCalled()
    expect(sendExpired).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })
})
