// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  upsertError: { message: string } | null
  recipientEmail: string | null
  targetDisplayName: string | null
  targetUsername: string | null
  resetLogInsertError: { message: string } | null
  assessmentDeleteError: { message: string } | null
  feedbackDeleteError: { message: string } | null
  coachProfileUpdateError: { message: string } | null
} = {
  user: null,
  role: null,
  upsertError: null,
  recipientEmail: null,
  targetDisplayName: null,
  targetUsername: null,
  resetLogInsertError: null,
  assessmentDeleteError: null,
  feedbackDeleteError: null,
  coachProfileUpdateError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const revalidateMock = vi.fn()
const emailSendsInsertMock = vi.fn(async (..._args: unknown[]) => ({ error: null }))
const sendDirectEmailHtmlMock = vi.fn()
const deleteEqMock = vi.fn(async (table: string, _column: string, _value: string) => ({
  error: table === 'assessment_attempts'
    ? state.assessmentDeleteError
    : table === 'feedback_requests'
      ? state.feedbackDeleteError
      : null,
}))
const updateEqMock = vi.fn(async (_table: string, _payload: unknown, _column: string, _value: string) => ({ error: state.coachProfileUpdateError }))
const resetLogInsertMock = vi.fn(async (_payload: unknown) => ({ error: state.resetLogInsertError }))

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
      insert: (payload: unknown) => table === 'admin_coach_dna_reset_log'
        ? resetLogInsertMock(payload)
        : emailSendsInsertMock(table, payload),
      delete: () => ({
        eq: (column: string, value: string) => deleteEqMock(table, column, value),
      }),
      update: (payload: unknown) => ({
        eq: (column: string, value: string) => updateEqMock(table, payload, column, value),
      }),
    }),
  }),
}))
vi.mock('@/lib/email', () => ({
  sendDirectEmailHtml: (...args: unknown[]) => sendDirectEmailHtmlMock(...args),
}))

import { updateAdminNote, sendDirectEmail, resetCoachDnaData } from './actions'

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

describe('resetCoachDnaData', () => {
  beforeEach(() => {
    state.user = { id: 'admin-1' }
    state.role = 'admin'
    state.resetLogInsertError = null
    state.assessmentDeleteError = null
    state.feedbackDeleteError = null
    state.coachProfileUpdateError = null
    deleteEqMock.mockClear()
    updateEqMock.mockClear()
    resetLogInsertMock.mockClear()
    revalidateMock.mockClear()
  })

  it('rejects unauthenticated callers without touching any data', async () => {
    state.user = null
    await expect(resetCoachDnaData('coach-2', 'reason')).rejects.toThrow('Unauthenticated')
    expect(deleteEqMock).not.toHaveBeenCalled()
  })

  it('rejects non-admin callers server-side without touching any data', async () => {
    state.role = 'coach'
    await expect(resetCoachDnaData('coach-2', 'reason')).rejects.toThrow('Forbidden')
    expect(deleteEqMock).not.toHaveBeenCalled()
  })

  it('rejects an empty (or whitespace-only) reason without touching any data', async () => {
    const result = await resetCoachDnaData('coach-2', '   ')
    expect(result).toEqual({ error: 'A reason is required' })
    expect(deleteEqMock).not.toHaveBeenCalled()
  })

  it('deletes assessment attempts and feedback requests for the target coach', async () => {
    await resetCoachDnaData('coach-2', 'Coach requested a redo')
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'coach-2')
    expect(deleteEqMock).toHaveBeenCalledWith('feedback_requests', 'coach_id', 'coach-2')
  })

  it('clears the cached AI summary fields on coach_profiles', async () => {
    await resetCoachDnaData('coach-2', 'Coach requested a redo')
    expect(updateEqMock).toHaveBeenCalledWith(
      'coach_profiles',
      { ai_summary: null, ai_summary_generated_at: null },
      'user_id',
      'coach-2',
    )
  })

  it('writes an audit log row with the admin id, coach id, and trimmed reason', async () => {
    await resetCoachDnaData('coach-2', '  Coach requested a redo  ')
    expect(resetLogInsertMock).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      coach_id: 'coach-2',
      reason: 'Coach requested a redo',
    })
  })

  it('revalidates the admin users page on success', async () => {
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({})
    expect(revalidateMock).toHaveBeenCalledWith('/admin/users')
  })

  it('surfaces the audit log insert error as a failed result without touching any data', async () => {
    state.resetLogInsertError = { message: 'insert failed' }
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({ error: 'insert failed' })
    expect(deleteEqMock).not.toHaveBeenCalled()
    expect(updateEqMock).not.toHaveBeenCalled()
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('writes the audit log before deleting data, so a log row exists even if a later step fails', async () => {
    const callOrder: string[] = []
    resetLogInsertMock.mockImplementationOnce(async (payload: unknown) => {
      callOrder.push('log-insert')
      return { error: state.resetLogInsertError }
    })
    deleteEqMock.mockImplementationOnce(async (table: string) => {
      callOrder.push(`delete:${table}`)
      return { error: null }
    })
    await resetCoachDnaData('coach-2', 'reason')
    expect(callOrder[0]).toBe('log-insert')
  })

  it('surfaces the assessment_attempts delete error and does not proceed to feedback_requests, coach_profiles, or revalidate', async () => {
    state.assessmentDeleteError = { message: 'assessment delete failed' }
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({ error: 'assessment delete failed' })
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'coach-2')
    expect(deleteEqMock).not.toHaveBeenCalledWith('feedback_requests', 'coach_id', 'coach-2')
    expect(updateEqMock).not.toHaveBeenCalled()
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('surfaces the feedback_requests delete error and does not proceed to coach_profiles or revalidate', async () => {
    state.feedbackDeleteError = { message: 'feedback delete failed' }
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({ error: 'feedback delete failed' })
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'coach-2')
    expect(deleteEqMock).toHaveBeenCalledWith('feedback_requests', 'coach_id', 'coach-2')
    expect(updateEqMock).not.toHaveBeenCalled()
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('surfaces the coach_profiles update error and does not revalidate', async () => {
    state.coachProfileUpdateError = { message: 'profile update failed' }
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({ error: 'profile update failed' })
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'coach-2')
    expect(deleteEqMock).toHaveBeenCalledWith('feedback_requests', 'coach_id', 'coach-2')
    expect(updateEqMock).toHaveBeenCalledWith(
      'coach_profiles',
      { ai_summary: null, ai_summary_generated_at: null },
      'user_id',
      'coach-2',
    )
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('allows an admin to reset their own Coach DNA data', async () => {
    const result = await resetCoachDnaData('admin-1', 'testing my own data')
    expect(result).toEqual({})
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'admin-1')
  })
})
