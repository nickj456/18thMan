// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  upsertError: { message: string } | null
} = { user: null, role: null, upsertError: null }

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const revalidateMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: table === 'profiles' ? { role: state.role } : null }),
        }),
      }),
      upsert: upsertMock,
    }),
  }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { admin: { deleteUser: async () => ({ error: null }) } } }),
}))

import { updateAdminNote } from './actions'

describe('updateAdminNote', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.upsertError = null
    upsertMock.mockClear()
    revalidateMock.mockClear()
  })

  it('rejects unauthenticated callers', async () => {
    state.user = null
    await expect(updateAdminNote('user-2', 'note')).rejects.toThrow('Unauthenticated')
  })

  it('rejects non-admin callers server-side', async () => {
    state.role = 'coach'
    await expect(updateAdminNote('user-2', 'note')).rejects.toThrow('Forbidden')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('upserts a trimmed note keyed on user_id and revalidates', async () => {
    const result = await updateAdminNote('user-2', '  watch this coach  ')
    expect(result).toEqual({})
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-2', note: 'watch this coach' }),
      { onConflict: 'user_id' },
    )
    expect(revalidateMock).toHaveBeenCalledWith('/admin/users')
  })

  it('surfaces the database error message without revalidating', async () => {
    state.upsertError = { message: 'permission denied' }
    const result = await updateAdminNote('user-2', 'note')
    expect(result).toEqual({ error: 'permission denied' })
    expect(revalidateMock).not.toHaveBeenCalled()
  })
})
