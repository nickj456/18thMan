// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubId: string | null
  existingGlobal: { id: string } | null
  insertError: { message: string } | null
  updateError: { message: string } | null
  upsertError: { message: string } | null
} = {
  user: null,
  role: null,
  clubId: null,
  existingGlobal: null,
  insertError: null,
  updateError: null,
  upsertError: null,
}

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})
const revalidateMock = vi.fn()
const autoDraftMock = vi.fn(async (..._args: unknown[]) => {})

const insertMock = vi.fn(async (payload: unknown) => ({ data: { id: 'focus-new' }, error: state.insertError }))
const updateEqMock = vi.fn(async (payload: unknown, id: string) => ({ data: { id }, error: state.updateError }))
const upsertMock = vi.fn(async (payload: unknown, opts: unknown) => ({ data: { id: 'focus-club' }, error: state.upsertError }))
const selectGlobalMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('@/lib/email-campaigns', () => ({
  createCampaignAutoDraft: (...args: unknown[]) => autoDraftMock(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role, club_id: state.clubId } }) }) }) }
      }
      if (table === 'weekly_focuses') {
        return {
          select: () => ({
            is: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  selectGlobalMock()
                  return { data: state.existingGlobal }
                },
              }),
            }),
          }),
          insert: (payload: unknown) => ({
            select: () => ({ single: async () => insertMock(payload) }),
          }),
          update: (payload: unknown) => ({
            eq: (_col: string, id: string) => ({
              select: () => ({ single: async () => updateEqMock(payload, id) }),
            }),
          }),
          upsert: (payload: unknown, opts: unknown) => ({
            select: () => ({ single: async () => upsertMock(payload, opts) }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { createWeeklyFocus } from './actions'

function formData(fields: Record<string, string>, drillIds: string[] = []): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  for (const id of drillIds) fd.append('drill_ids', id)
  return fd
}

describe('createWeeklyFocus', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.clubId = null
    state.existingGlobal = null
    state.insertError = null
    state.updateError = null
    state.upsertError = null
    redirectMock.mockClear()
    revalidateMock.mockClear()
    autoDraftMock.mockClear()
    insertMock.mockClear()
    updateEqMock.mockClear()
    upsertMock.mockClear()
    selectGlobalMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique' }))).rejects.toThrow('REDIRECT:/login')
  })

  it('rejects non-admin callers without writing anything', async () => {
    state.role = 'coach'
    const result = await createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique' }))
    expect(result).toEqual({ error: 'Admin only' })
    expect(insertMock).not.toHaveBeenCalled()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects a club-specific publish when the admin has no club, without writing anything', async () => {
    state.clubId = null
    const result = await createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique' }))
    expect(result).toEqual({ error: 'You need a club to publish a club-specific focus. Publish globally instead.' })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts a new global focus when no global focus exists yet for this week', async () => {
    state.clubId = null
    state.existingGlobal = null
    await expect(
      createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique', global: 'on' })),
    ).rejects.toThrow('REDIRECT:/weekly-focus')
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      club_id: null,
      topic: 'Tackling',
      description: 'Focus on technique',
      created_by: 'admin-1',
    }))
    expect(updateEqMock).not.toHaveBeenCalled()
  })

  it('updates the existing global focus for this week instead of inserting a duplicate', async () => {
    state.clubId = null
    state.existingGlobal = { id: 'focus-existing' }
    await expect(
      createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique', global: 'on' })),
    ).rejects.toThrow('REDIRECT:/weekly-focus')
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ topic: 'Tackling' }), 'focus-existing')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('publishes globally even when the admin belongs to a club, if the global checkbox is checked', async () => {
    state.clubId = 'club-1'
    state.existingGlobal = null
    await expect(
      createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique', global: 'on' })),
    ).rejects.toThrow('REDIRECT:/weekly-focus')
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null }))
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('publishes a club-specific focus via upsert when the global checkbox is unchecked and the admin has a club', async () => {
    state.clubId = 'club-1'
    await expect(
      createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique' })),
    ).rejects.toThrow('REDIRECT:/weekly-focus')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ club_id: 'club-1', topic: 'Tackling' }),
      { onConflict: 'club_id,week_start' },
    )
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('redirects to /weekly-focus after a successful publish', async () => {
    state.clubId = null
    await expect(
      createWeeklyFocus(formData({ topic: 'Tackling', description: 'Focus on technique', global: 'on' })),
    ).rejects.toThrow('REDIRECT:/weekly-focus')
    expect(revalidateMock).toHaveBeenCalledWith('/weekly-focus')
    expect(revalidateMock).toHaveBeenCalledWith('/dashboard')
  })
})
