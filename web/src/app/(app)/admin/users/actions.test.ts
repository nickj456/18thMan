// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  upsertError: { message: string } | null
  recipientEmail: string | null
  targetDisplayName: string | null
  targetUsername: string | null
} = {
  user: null,
  role: null,
  upsertError: null,
  recipientEmail: null,
  targetDisplayName: null,
  targetUsername: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const revalidateMock = vi.fn()
const emailSendsInsertMock = vi.fn(async (..._args: unknown[]) => ({ error: null }))
const sendDirectEmailHtmlMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === 'profiles'
              ? { role: state.role, display_name: state.targetDisplayName, username: state.targetUsername }
              : null,
          }),
        }),
      }),
      upsert: upsertMock,
    }),
  }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        deleteUser: async () => ({ error: null }),
        getUserById: async () => ({
          data: { user: state.recipientEmail ? { email: state.recipientEmail } : null },
        }),
      },
    },
    from: (table: string) => ({
      insert: (payload: unknown) => emailSendsInsertMock(table, payload),
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  sendDirectEmailHtml: (...args: unknown[]) => sendDirectEmailHtmlMock(...args),
}))

import { updateAdminNote, sendDirectEmail } from './actions'

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

describe('sendDirectEmail', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.recipientEmail = 'coach@example.com'
    state.targetDisplayName = 'Alex Coach'
    state.targetUsername = 'alexc'
    sendDirectEmailHtmlMock.mockReset()
    sendDirectEmailHtmlMock.mockResolvedValue({ success: true, messageId: 'msg_1' })
    emailSendsInsertMock.mockReset()
    emailSendsInsertMock.mockResolvedValue({ error: null })
  })

  it('rejects unauthenticated callers', async () => {
    state.user = null
    await expect(sendDirectEmail('user-2', 'Hi', '<p>Hi</p>')).rejects.toThrow('Unauthenticated')
    expect(sendDirectEmailHtmlMock).not.toHaveBeenCalled()
  })

  it('rejects non-admin callers server-side', async () => {
    state.role = 'coach'
    await expect(sendDirectEmail('user-2', 'Hi', '<p>Hi</p>')).rejects.toThrow('Forbidden')
    expect(sendDirectEmailHtmlMock).not.toHaveBeenCalled()
  })

  it('rejects an empty subject', async () => {
    const result = await sendDirectEmail('user-2', '   ', '<p>Hi</p>')
    expect(result).toEqual({ error: 'Subject is required' })
    expect(sendDirectEmailHtmlMock).not.toHaveBeenCalled()
  })

  it('rejects an empty body', async () => {
    const result = await sendDirectEmail('user-2', 'Hi', '   ')
    expect(result).toEqual({ error: 'Message body is required' })
    expect(sendDirectEmailHtmlMock).not.toHaveBeenCalled()
  })

  it('errors when the target user has no email on file', async () => {
    state.recipientEmail = null
    const result = await sendDirectEmail('user-2', 'Hi', '<p>Hi</p>')
    expect(result).toEqual({ error: 'This user has no email on file' })
    expect(sendDirectEmailHtmlMock).not.toHaveBeenCalled()
  })

  it('sends the email and logs to email_sends on success', async () => {
    const result = await sendDirectEmail('user-2', 'Hi Coach', '<p>Great work</p>')
    expect(result).toEqual({})
    expect(sendDirectEmailHtmlMock).toHaveBeenCalledWith('coach@example.com', 'Alex Coach', 'Hi Coach', '<p>Great work</p>')
    expect(emailSendsInsertMock).toHaveBeenCalledWith('email_sends', {
      user_id: 'user-2',
      category: 'direct_admin',
      resend_message_id: 'msg_1',
    })
  })

  it('surfaces the email send error without logging', async () => {
    sendDirectEmailHtmlMock.mockResolvedValue({ success: false, error: 'invalid recipient' })
    const result = await sendDirectEmail('user-2', 'Hi', '<p>Hi</p>')
    expect(result).toEqual({ error: 'invalid recipient' })
    expect(emailSendsInsertMock).not.toHaveBeenCalled()
  })
})
