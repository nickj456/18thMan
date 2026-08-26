# Coach DNA Admin Data Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin reset a coach's Coach DNA data (self-assessment attempts and feedback requests/responses), with a required reason logged to a new audit trail.

**Architecture:** One combined Server Action deletes the coach's `assessment_attempts` and `feedback_requests` rows (both cascade their children), clears the non-cascading cached AI summary fields on `coach_profiles`, and writes one audit-log row — all via the service-role client, matching the existing `deleteUser` action's precedent in the same file. A new button in the existing `/admin/users` roster table triggers it, reusing `DeleteUserButton`'s confirm-modal pattern with an added required reason field.

**Tech Stack:** Next.js App Router (Server Actions), Supabase (Postgres + service-role client), Vitest, `sonner` (toast).

**Spec:** `docs/superpowers/specs/2026-08-25-coach-dna-admin-reset-design.md`

## Global Constraints

- One combined reset action — no granular assessment-only or feedback-only variants.
- A reason is required (non-empty after trimming) and persisted verbatim to the audit log.
- Every operation is gated by the existing `requireAdmin()` helper already in `web/src/app/(app)/admin/users/actions.ts` — no new auth mechanism.
- Uses the service-role client (`createClient` from `@supabase/supabase-js`, aliased as in the existing file), matching `deleteUser`'s existing pattern in the same file — not the shared `@/lib/supabase/service` helper, for consistency within this specific file.
- No self-target guard (unlike `deleteUser`) — resetting your own Coach DNA data is allowed.
- If migration number `121` is no longer free by the time Task 1 runs (other work may have claimed it), use the next free number and adjust every reference to `121` in this plan accordingly.

---

### Task 1: Audit log migration

**Files:**
- Create: `web/supabase/migrations/121_admin_coach_dna_reset_log.sql`

**Interfaces:**
- Produces: `public.admin_coach_dna_reset_log` table (`id`, `admin_id`, `coach_id`, `reason`, `created_at`) — consumed by Task 2's `resetCoachDnaData` action (inserts one row per reset).

- [ ] **Step 1: Check the next free migration number**

Run: `cd web && ls supabase/migrations | sort | tail -5`
Expected: `120_feedback_requests_coach_delete.sql` is the highest sequentially-numbered file (a `20260601153744_admin_user_notes.sql` timestamp-named file may also be present — ignore it for numbering purposes). If `121_*` already exists, use `122` (or the next free number) instead, and use that number for the filename and everywhere else in this task.

- [ ] **Step 2: Create the migration**

Create `web/supabase/migrations/121_admin_coach_dna_reset_log.sql`:

```sql
-- Audit trail for admin-initiated Coach DNA data resets, mirroring the
-- existing admin_feedback_access_log precedent (migration 092) for the same
-- reason: this touches safeguarding-adjacent data (player/parent/peer
-- feedback), so a destructive admin action here should leave a record.
create table public.admin_coach_dna_reset_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles(id),
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);

create index admin_coach_dna_reset_log_coach_id_idx on public.admin_coach_dna_reset_log(coach_id);

alter table public.admin_coach_dna_reset_log enable row level security;

create policy "Admins can view the reset log"
  on public.admin_coach_dna_reset_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

No insert policy is needed — the reset action always runs through the service-role client (Task 2), which bypasses RLS, matching how `admin_feedback_access_log` rows are written today.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/121_admin_coach_dna_reset_log.sql
git commit -m "feat(coach-dna): add admin_coach_dna_reset_log audit table"
```

---

### Task 2: `resetCoachDnaData` Server Action

**Files:**
- Modify: `web/src/app/(app)/admin/users/actions.ts`
- Modify: `web/src/app/(app)/admin/users/actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin()` (existing local helper in this file, returns `{ supabase, user }`); `public.admin_coach_dna_reset_log` (Task 1).
- Produces: `export async function resetCoachDnaData(targetUserId: string, reason: string): Promise<{ error?: string }>` — consumed by Task 3's `ResetCoachDnaButton`.

The current `web/src/app/(app)/admin/users/actions.ts` in full:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/supabase/types'
import { sendDirectEmailHtml } from '@/lib/email'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/users')
}

export async function updateAdminNote(targetUserId: string, note: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin()
  if (note.length > 2000) return { error: 'Note too long (max 2000 characters)' }
  const { error } = await supabase
    .from('admin_user_notes')
    .upsert({ user_id: targetUserId, note: note.trim(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  const { user } = await requireAdmin()
  if (targetUserId === user.id) return { error: 'You cannot delete your own account' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceClient.auth.admin.deleteUser(targetUserId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

export async function sendDirectEmail(
  targetUserId: string,
  subject: string,
  bodyHtml: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin()

  const trimmedSubject = subject.trim()
  const trimmedBody = bodyHtml.trim()
  if (!trimmedSubject) return { error: 'Subject is required' }
  if (!trimmedBody) return { error: 'Message body is required' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: authUser }, { data: profile }] = await Promise.all([
    serviceClient.auth.admin.getUserById(targetUserId),
    supabase.from('profiles').select('display_name, username').eq('id', targetUserId).single(),
  ])

  const recipientEmail = authUser?.user?.email
  if (!recipientEmail) return { error: 'This user has no email on file' }

  const displayName = profile?.display_name ?? profile?.username ?? ''

  const result = await sendDirectEmailHtml(recipientEmail, displayName, trimmedSubject, trimmedBody)
  if (!result.success) return { error: result.error }

  await serviceClient.from('email_sends').insert({
    user_id: targetUserId,
    category: 'direct_admin',
    resend_message_id: result.messageId ?? null,
  })

  return {}
}
```

The current `web/src/app/(app)/admin/users/actions.test.ts` in full:

```ts
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
```

- [ ] **Step 1: Write the failing tests**

Replace `web/src/app/(app)/admin/users/actions.test.ts` in full — this extends the `@supabase/supabase-js` mock's `from(table)` to also support `.delete().eq()` and `.update().eq()`, table-routed, while preserving every existing test's behavior unchanged:

```ts
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
} = {
  user: null,
  role: null,
  upsertError: null,
  recipientEmail: null,
  targetDisplayName: null,
  targetUsername: null,
  resetLogInsertError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const revalidateMock = vi.fn()
const emailSendsInsertMock = vi.fn(async (..._args: unknown[]) => ({ error: null }))
const sendDirectEmailHtmlMock = vi.fn()
const deleteEqMock = vi.fn(async (_table: string, _column: string, _value: string) => ({ error: null }))
const updateEqMock = vi.fn(async (_table: string, _payload: unknown, _column: string, _value: string) => ({ error: null }))
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

  it('surfaces the audit log insert error as a failed result', async () => {
    state.resetLogInsertError = { message: 'insert failed' }
    const result = await resetCoachDnaData('coach-2', 'reason')
    expect(result).toEqual({ error: 'insert failed' })
  })

  it('allows an admin to reset their own Coach DNA data', async () => {
    const result = await resetCoachDnaData('admin-1', 'testing my own data')
    expect(result).toEqual({})
    expect(deleteEqMock).toHaveBeenCalledWith('assessment_attempts', 'coach_id', 'admin-1')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/users/actions.test.ts"`
Expected: FAIL — `Cannot find export 'resetCoachDnaData'` (or similar) since the function doesn't exist yet.

- [ ] **Step 3: Implement `resetCoachDnaData`**

Add to `web/src/app/(app)/admin/users/actions.ts`, after the existing `deleteUser` function:

```ts
export async function resetCoachDnaData(targetUserId: string, reason: string): Promise<{ error?: string }> {
  const { user } = await requireAdmin()

  const trimmedReason = reason.trim()
  if (!trimmedReason) return { error: 'A reason is required' }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await serviceClient.from('assessment_attempts').delete().eq('coach_id', targetUserId)
  await serviceClient.from('feedback_requests').delete().eq('coach_id', targetUserId)
  await serviceClient
    .from('coach_profiles')
    .update({ ai_summary: null, ai_summary_generated_at: null })
    .eq('user_id', targetUserId)

  const { error: logError } = await serviceClient
    .from('admin_coach_dna_reset_log')
    .insert({ admin_id: user.id, coach_id: targetUserId, reason: trimmedReason })
  if (logError) return { error: logError.message }

  revalidatePath('/admin/users')
  return {}
}
```

`assessment_attempts` deletion cascades `assessment_responses` (migration `086`); `feedback_requests` deletion cascades `feedback_responses` → `feedback_answers` → `safeguarding_flags`, and `response_disputes`/`admin_feedback_access_log` cascade from `feedback_responses` too (migration `120`'s comment documents this chain explicitly) — no explicit child-table cleanup needed. `coach_profiles.ai_summary`/`ai_summary_generated_at` are not foreign-keyed to attempts, so they're cleared explicitly; a coach with no `coach_profiles` row yet makes this `.update()` match zero rows, which is not an error.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/users/actions.test.ts"`
Expected: PASS (same test count as before this step + 10 new `resetCoachDnaData` tests; the two existing `describe` blocks are unchanged in behavior).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/users/actions.ts" "web/src/app/(app)/admin/users/actions.test.ts"
git commit -m "feat(coach-dna): add resetCoachDnaData admin action"
```

---

### Task 3: `ResetCoachDnaButton` UI, wired into the users table

**Files:**
- Create: `web/src/app/(app)/admin/users/ResetCoachDnaButton.tsx`
- Modify: `web/src/app/(app)/admin/users/UsersTable.tsx`

**Interfaces:**
- Consumes: `resetCoachDnaData(targetUserId: string, reason: string): Promise<{ error?: string }>` from `./actions` (Task 2).
- Produces: `export function ResetCoachDnaButton({ userId, displayName }: { userId: string; displayName: string })` — consumed by `UsersTable.tsx`.

No dedicated test file for this component — matches the established precedent in this exact directory: neither `DeleteUserButton.tsx` nor `SendEmailButton.tsx` (the two existing confirm-dialog button components this one is modeled on) has its own test file.

- [ ] **Step 1: Create `ResetCoachDnaButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { resetCoachDnaData } from './actions'
import { toast } from 'sonner'

interface ResetCoachDnaButtonProps {
  userId: string
  displayName: string
}

export function ResetCoachDnaButton({ userId, displayName }: ResetCoachDnaButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleReset() {
    startTransition(async () => {
      const result = await resetCoachDnaData(userId, reason)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${displayName}'s Coach DNA data reset`)
        setReason('')
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Reset {displayName}&apos;s Coach DNA data?</h3>
              <p className="text-sm text-zinc-400 mt-1">
                This permanently deletes their self-assessment, all feedback requests and responses,
                and their cached results. This cannot be undone.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="reset-reason" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Reason
            </label>
            <textarea
              id="reset-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Coach requested a redo"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={isPending || !reason.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              {isPending ? 'Resetting…' : 'Reset data'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      title={`Reset ${displayName}'s Coach DNA data`}
    >
      <RotateCcw size={14} />
    </button>
  )
}
```

- [ ] **Step 2: Wire it into `UsersTable.tsx`**

Add the import, alongside the existing `import { DeleteUserButton } from './DeleteUserButton'`:

```tsx
import { ResetCoachDnaButton } from './ResetCoachDnaButton'
```

In the table header, change the two trailing empty `<th>` elements (currently exactly these two lines):

```tsx
              <th className="px-3 py-3" />
              <th className="px-5 py-3" />
```

to three:

```tsx
              <th className="px-3 py-3" />
              <th className="px-3 py-3" />
              <th className="px-5 py-3" />
```

Change the empty-state row's `colSpan` from `cols.length + 4` to `cols.length + 5`:

```tsx
                <td colSpan={cols.length + 5} className="px-5 py-10 text-center text-sm text-zinc-600">No users found</td>
```

In each row, add a new `<td>` between the existing "Send email" and "Delete" columns (currently these two blocks appear consecutively):

```tsx
                  {/* Send email */}
                  <td className="px-3 py-3.5">
                    <SendEmailButton
                      userId={profile.id}
                      displayName={profile.display_name ?? profile.username ?? 'this user'}
                    />
                  </td>
                  {/* Delete */}
                  <td className="px-3 py-3.5">
                    {profile.id !== currentUserId && (
                      <DeleteUserButton
                        userId={profile.id}
                        displayName={profile.display_name ?? profile.username ?? 'User'}
                      />
                    )}
                  </td>
```

becomes:

```tsx
                  {/* Send email */}
                  <td className="px-3 py-3.5">
                    <SendEmailButton
                      userId={profile.id}
                      displayName={profile.display_name ?? profile.username ?? 'this user'}
                    />
                  </td>
                  {/* Reset Coach DNA data */}
                  <td className="px-3 py-3.5">
                    <ResetCoachDnaButton
                      userId={profile.id}
                      displayName={profile.display_name ?? profile.username ?? 'this user'}
                    />
                  </td>
                  {/* Delete */}
                  <td className="px-3 py-3.5">
                    {profile.id !== currentUserId && (
                      <DeleteUserButton
                        userId={profile.id}
                        displayName={profile.display_name ?? profile.username ?? 'User'}
                      />
                    )}
                  </td>
```

(No `profile.id !== currentUserId` guard on the new column, per the Global Constraints — every row gets the reset button, including the admin's own row.)

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd web && npm run test`
Expected: PASS, full suite green (no test directly renders `UsersTable`/`ResetCoachDnaButton` today, so this step confirms nothing elsewhere broke, not new coverage for this step).

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/users/ResetCoachDnaButton.tsx" "web/src/app/(app)/admin/users/UsersTable.tsx"
git commit -m "feat(coach-dna): add Reset Coach DNA data button to the admin users table"
```

---

## Self-Review Notes

**Spec coverage:** Part 1 (audit log table) → Task 1. Part 2 (Server Action) → Task 2. Part 3 (UI) → Task 3. Security section: role gate via existing `requireAdmin()` (Task 2), service-role client matching `deleteUser`'s established precedent (Task 2). Testing section's listed cases (role-gated, empty reason, deletes both tables, nulls `coach_profiles`, writes exactly one log row) are all covered in Task 2's test additions.

**Placeholder scan:** No TBD/TODO markers. Task 2 includes the full current content of both files it modifies, so its diff is unambiguous.

**Type consistency:** `resetCoachDnaData(targetUserId: string, reason: string): Promise<{ error?: string }>` (Task 2) matches its call site in Task 3's `ResetCoachDnaButton.tsx` (`resetCoachDnaData(userId, reason)`) exactly — same parameter order, same return shape consumed via `result.error`.
