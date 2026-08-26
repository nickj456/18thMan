// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  activeAnnouncement: { id: string; message: string; link_url: string | null; link_label: string | null } | null
  dismissed: boolean
  upsertError: { message: string } | null
  insertError: { message: string } | null
  updateError: { message: string } | null
  deleteError: { message: string } | null
} = {
  user: null,
  role: null,
  activeAnnouncement: null,
  dismissed: false,
  upsertError: null,
  insertError: null,
  updateError: null,
  deleteError: null,
}

const selectActiveMock = vi.fn()
const selectDismissalMock = vi.fn()
const upsertMock = vi.fn(async (payload: unknown, opts: unknown) => {
  upsertArgs.push([payload, opts])
  return { error: state.upsertError }
})
const upsertArgs: unknown[][] = []
const insertMock = vi.fn(async (payload: unknown) => ({ error: state.insertError }))
const updateEqMock = vi.fn(async (payload: unknown, column: string, value: string) => ({ error: state.updateError }))
const deleteEqMock = vi.fn(async (column: string, value: string) => ({ error: state.deleteError }))
const orFilterMock = vi.fn()
const revalidateMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'announcements') {
        return {
          select: () => ({
            eq: () => ({
              or: (filter: string) => {
                orFilterMock(filter)
                return {
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => {
                        selectActiveMock()
                        return { data: state.activeAnnouncement }
                      },
                    }),
                  }),
                }
              },
            }),
          }),
          insert: (payload: unknown) => insertMock(payload),
          update: (payload: unknown) => ({
            eq: (column: string, value: string) => updateEqMock(payload, column, value),
          }),
          delete: () => ({
            eq: (column: string, value: string) => deleteEqMock(column, value),
          }),
        }
      }
      if (table === 'announcement_dismissals') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  selectDismissalMock()
                  return { data: state.dismissed ? { announcement_id: 'ann-1' } : null }
                },
              }),
            }),
          }),
          upsert: (payload: unknown, opts: unknown) => upsertMock(payload, opts),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { getActiveAnnouncementForUser, dismissAnnouncement, createAnnouncement, setAnnouncementActive, deleteAnnouncement } from './actions'

describe('getActiveAnnouncementForUser', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.activeAnnouncement = null
    state.dismissed = false
    selectActiveMock.mockClear()
    selectDismissalMock.mockClear()
    orFilterMock.mockClear()
  })

  it('returns null when there is no active announcement', async () => {
    const result = await getActiveAnnouncementForUser()
    expect(result).toBeNull()
    expect(selectDismissalMock).not.toHaveBeenCalled()
  })

  it('returns null when there is no authenticated user', async () => {
    state.user = null
    state.activeAnnouncement = { id: 'ann-1', message: 'Try Coach DNA', link_url: null, link_label: null }
    const result = await getActiveAnnouncementForUser()
    expect(result).toBeNull()
  })

  it('returns null when the caller has no profile role on file', async () => {
    state.role = null
    state.activeAnnouncement = { id: 'ann-1', message: 'Try Coach DNA', link_url: null, link_label: null }
    const result = await getActiveAnnouncementForUser()
    expect(result).toBeNull()
  })

  it('returns the active announcement when the user has not dismissed it', async () => {
    state.activeAnnouncement = { id: 'ann-1', message: 'Try Coach DNA', link_url: '/admin/coach-dna', link_label: 'Try it' }
    const result = await getActiveAnnouncementForUser()
    expect(result).toEqual({ id: 'ann-1', message: 'Try Coach DNA', linkUrl: '/admin/coach-dna', linkLabel: 'Try it' })
  })

  it('returns null when the user has already dismissed the active announcement', async () => {
    state.activeAnnouncement = { id: 'ann-1', message: 'Try Coach DNA', link_url: null, link_label: null }
    state.dismissed = true
    const result = await getActiveAnnouncementForUser()
    expect(result).toBeNull()
  })

  it('queries only untargeted announcements or ones targeting the caller\'s own role', async () => {
    state.role = 'viewer'
    await getActiveAnnouncementForUser()
    expect(orFilterMock).toHaveBeenCalledWith('target_roles.is.null,target_roles.cs.{viewer}')
  })
})

describe('dismissAnnouncement', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.upsertError = null
    upsertArgs.length = 0
  })

  it('rejects unauthenticated callers without writing a dismissal', async () => {
    state.user = null
    const result = await dismissAnnouncement('ann-1')
    expect(result).toEqual({ error: 'Unauthenticated' })
    expect(upsertArgs).toHaveLength(0)
  })

  it('upserts a dismissal row keyed by announcement and user, ignoring a duplicate click', async () => {
    const result = await dismissAnnouncement('ann-1')
    expect(result).toEqual({})
    expect(upsertArgs[0][0]).toEqual({ announcement_id: 'ann-1', user_id: 'coach-1' })
    expect(upsertArgs[0][1]).toEqual({ onConflict: 'announcement_id,user_id' })
  })

  it('surfaces the database error', async () => {
    state.upsertError = { message: 'insert failed' }
    const result = await dismissAnnouncement('ann-1')
    expect(result).toEqual({ error: 'insert failed' })
  })
})

describe('createAnnouncement', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.insertError = null
    insertMock.mockClear()
    revalidateMock.mockClear()
  })

  function formData(fields: Record<string, string>, roles: string[] = []): FormData {
    const fd = new FormData()
    for (const [key, value] of Object.entries(fields)) fd.set(key, value)
    for (const role of roles) fd.append('roles', role)
    return fd
  }

  it('rejects unauthenticated callers', async () => {
    state.user = null
    await expect(createAnnouncement(formData({ message: 'Try Coach DNA' }))).rejects.toThrow('Unauthenticated')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects non-admin callers', async () => {
    state.role = 'coach'
    await expect(createAnnouncement(formData({ message: 'Try Coach DNA' }))).rejects.toThrow('Forbidden')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects an empty message', async () => {
    await expect(createAnnouncement(formData({ message: '   ' }))).rejects.toThrow('Message is required')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('inserts a trimmed message with optional link fields, the creator, and revalidates', async () => {
    await createAnnouncement(formData({
      message: '  Try Coach DNA  ',
      linkUrl: '/admin/coach-dna',
      linkLabel: 'Try it',
      active: 'on',
    }))
    expect(insertMock).toHaveBeenCalledWith({
      message: 'Try Coach DNA',
      link_url: '/admin/coach-dna',
      link_label: 'Try it',
      active: true,
      created_by: 'admin-1',
      target_roles: null,
    })
    expect(revalidateMock).toHaveBeenCalledWith('/admin/announcements')
  })

  it('treats blank link fields as null and an unchecked active checkbox as false', async () => {
    await createAnnouncement(formData({ message: 'Try Coach DNA', linkUrl: '', linkLabel: '' }))
    expect(insertMock).toHaveBeenCalledWith({
      message: 'Try Coach DNA',
      link_url: null,
      link_label: null,
      active: false,
      created_by: 'admin-1',
      target_roles: null,
    })
  })

  it('stores target_roles as null (everyone) when no role checkboxes are checked', async () => {
    await createAnnouncement(formData({ message: 'Try Coach DNA' }, []))
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ target_roles: null }))
  })

  it('stores target_roles as null (everyone) when all three role checkboxes are checked', async () => {
    await createAnnouncement(formData({ message: 'Try Coach DNA' }, ['coach', 'admin', 'viewer']))
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ target_roles: null }))
  })

  it('stores the selected subset of roles when fewer than all three are checked', async () => {
    await createAnnouncement(formData({ message: 'Try Coach DNA' }, ['coach', 'admin']))
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ target_roles: ['coach', 'admin'] }))
  })

  it('surfaces the database error without revalidating', async () => {
    state.insertError = { message: 'insert failed' }
    await expect(createAnnouncement(formData({ message: 'Try Coach DNA' }))).rejects.toThrow('insert failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })
})

describe('setAnnouncementActive', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.updateError = null
    updateEqMock.mockClear()
    revalidateMock.mockClear()
  })

  it('rejects non-admin callers', async () => {
    state.role = 'coach'
    await expect(setAnnouncementActive('ann-1', true)).rejects.toThrow('Forbidden')
    expect(updateEqMock).not.toHaveBeenCalled()
  })

  it('updates the active flag and revalidates', async () => {
    await setAnnouncementActive('ann-1', true)
    expect(updateEqMock).toHaveBeenCalledWith({ active: true }, 'id', 'ann-1')
    expect(revalidateMock).toHaveBeenCalledWith('/admin/announcements')
  })

  it('surfaces the database error without revalidating', async () => {
    state.updateError = { message: 'update failed' }
    await expect(setAnnouncementActive('ann-1', false)).rejects.toThrow('update failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })
})

describe('deleteAnnouncement', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.deleteError = null
    deleteEqMock.mockClear()
    revalidateMock.mockClear()
  })

  it('rejects unauthenticated callers', async () => {
    state.user = null
    await expect(deleteAnnouncement('ann-1')).rejects.toThrow('Unauthenticated')
    expect(deleteEqMock).not.toHaveBeenCalled()
  })

  it('rejects non-admin callers', async () => {
    state.role = 'coach'
    await expect(deleteAnnouncement('ann-1')).rejects.toThrow('Forbidden')
    expect(deleteEqMock).not.toHaveBeenCalled()
  })

  it('deletes the announcement by id and revalidates', async () => {
    await deleteAnnouncement('ann-1')
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'ann-1')
    expect(revalidateMock).toHaveBeenCalledWith('/admin/announcements')
  })

  it('surfaces the database error without revalidating', async () => {
    state.deleteError = { message: 'delete failed' }
    await expect(deleteAnnouncement('ann-1')).rejects.toThrow('delete failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })
})
