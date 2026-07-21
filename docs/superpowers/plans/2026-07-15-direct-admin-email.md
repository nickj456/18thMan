# Direct Admin → User Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a platform admin send a one-off email directly to a single user from `/admin/users`, logged to the existing `email_sends` table and visible in the existing Transactional tab.

**Architecture:** A new `sendDirectEmailHtml()` helper in `web/src/lib/email.ts` renders the message in the existing branded `layout()` template and sends via Resend. A new `sendDirectEmail()` server action in `web/src/app/(app)/admin/users/actions.ts` (admin-gated) resolves the recipient's email via the Supabase Auth admin API, calls the email helper, and logs to `email_sends`. A new client component `SendEmailButton.tsx` adds a per-row compose modal to `UsersTable.tsx`, following the exact UI pattern already used by `DeleteUserButton.tsx`.

**Tech Stack:** Next.js Server Actions, Supabase (service-role client for `auth.admin.getUserById` and `email_sends` insert), Resend, Vitest.

## Global Constraints

- Sender scope: platform admins only (`profiles.role = 'admin'`), verified server-side — never trust client-side role checks (project rule).
- Outbound email only — no DM/conversation record is created (per approved spec).
- Text-only compose in v1: subject + HTML-allowed body, no attachments — mirrors the existing campaign composer's "HTML allowed" textarea pattern (`web/src/app/(app)/admin/email/compose/page.tsx`), not a new WYSIWYG.
- No new migration — reuses the existing `email_sends` table (`web/supabase/migrations/052_email_system.sql`) with a new `category` value `'direct_admin'`.
- Every async UI action needs loading, empty/idle, and error states (project rule) — the compose modal must show a pending state on send and surface action errors inline.
- Every conditional gets both branches tested (project rule) — admin/non-admin, present/missing recipient email, send success/failure.

---

### Task 1: `sendDirectEmailHtml` email helper

**Files:**
- Modify: `web/src/lib/email.ts` (add new exported function after `sendGroupAddedEmail`, i.e. after line 646, before the "Unsubscribe footer" section comment)
- Create: `web/src/lib/email.test.ts`

**Interfaces:**
- Produces: `sendDirectEmailHtml(to: string, displayName: string, subject: string, bodyHtml: string): Promise<EmailResultWithId>` — `EmailResultWithId` is already defined in this file (`{ success: boolean; error?: string; messageId?: string }`).
- Consumes: existing in-file helpers `getResend()`, `layout()`, `heading()`, `divider()`, `greeting()`, `sign()`, `esc()`, and the module-level `FROM` constant — all already defined in `web/src/lib/email.ts`.

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/email.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}))

import { sendDirectEmailHtml } from './email'

describe('sendDirectEmailHtml', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('returns an error when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY
    const result = await sendDirectEmailHtml('coach@example.com', 'Alex', 'Hi', '<p>Hello</p>')
    expect(result).toEqual({ success: false, error: 'RESEND_API_KEY not configured' })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('sends the email with the subject, recipient, and rendered HTML body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_123' }, error: null })
    const result = await sendDirectEmailHtml('coach@example.com', 'Alex', 'Welcome back', '<p>Great session!</p>')
    expect(result).toEqual({ success: true, messageId: 'msg_123' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      subject: 'Welcome back',
      html: expect.stringContaining('<p>Great session!</p>'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Alex'),
    }))
  })

  it('returns the Resend error message when the send fails', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'invalid recipient' } })
    const result = await sendDirectEmailHtml('bad@example.com', 'Alex', 'Hi', '<p>Hi</p>')
    expect(result).toEqual({ success: false, error: 'invalid recipient' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: FAIL — `sendDirectEmailHtml` is not exported from `./email`.

- [ ] **Step 3: Implement `sendDirectEmailHtml`**

In `web/src/lib/email.ts`, insert the following function immediately after the closing brace of `sendGroupAddedEmail` (after line 646) and before the `// ── Unsubscribe footer ...` comment (line 648):

```ts
/** Sent when an admin composes a one-off email to a specific user */
export async function sendDirectEmailHtml(
  to: string,
  displayName: string,
  subject: string,
  bodyHtml: string,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = layout(`
    ${heading(esc(subject))}
    ${divider()}
    ${greeting(esc(displayName))}
    <div style="color:#a1a1aa;font-size:15px;line-height:1.6;">${bodyHtml}</div>
    ${sign()}
  `)

  try {
    const { data, error } = await resendClient.emails.send({ from: FROM, to, subject, html })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/email.ts web/src/lib/email.test.ts
git commit -m "feat(email): add sendDirectEmailHtml for admin-to-user email"
```

---

### Task 2: `sendDirectEmail` server action

**Files:**
- Modify: `web/src/app/(app)/admin/users/actions.ts`
- Modify: `web/src/app/(app)/admin/users/actions.test.ts` (rewrite in full — existing mocks are extended to support the new action without breaking current tests)

**Interfaces:**
- Consumes: `sendDirectEmailHtml` from Task 1 (`web/src/lib/email.ts`); the existing `requireAdmin()` helper in this file; the existing `createClient as createServiceClient` import from `@supabase/supabase-js`.
- Produces: `sendDirectEmail(targetUserId: string, subject: string, bodyHtml: string): Promise<{ error?: string }>` — consumed by Task 3's `SendEmailButton.tsx`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `web/src/app/(app)/admin/users/actions.test.ts` with:

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
const emailSendsInsertMock = vi.fn(async () => ({ error: null }))
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

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd web && npx vitest run src/app/\(app\)/admin/users/actions.test.ts`
Expected: the 4 `updateAdminNote` tests PASS; the 7 new `sendDirectEmail` tests FAIL — `sendDirectEmail` is not exported from `./actions`.

- [ ] **Step 3: Implement `sendDirectEmail`**

In `web/src/app/(app)/admin/users/actions.ts`, add an import at the top (after the existing `UserRole` type import):

```ts
import { sendDirectEmailHtml } from '@/lib/email'
```

Then append this function at the end of the file:

```ts
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/app/\(app\)/admin/users/actions.test.ts`
Expected: PASS (11 tests total)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/users/actions.ts" "web/src/app/(app)/admin/users/actions.test.ts"
git commit -m "feat(admin): add sendDirectEmail server action"
```

---

### Task 3: `SendEmailButton` compose modal + wire into `UsersTable`

**Files:**
- Create: `web/src/app/(app)/admin/users/SendEmailButton.tsx`
- Modify: `web/src/app/(app)/admin/users/UsersTable.tsx`

**Interfaces:**
- Consumes: `sendDirectEmail(targetUserId, subject, bodyHtml)` from Task 2 (`./actions`); `toast` from `sonner` (already used by `DeleteUserButton.tsx`).
- Produces: `SendEmailButton({ userId, displayName }: { userId: string; displayName: string })` — a client component, imported into `UsersTable.tsx`.

- [ ] **Step 1: Create `SendEmailButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Mail, Loader2, X, Send } from 'lucide-react'
import { sendDirectEmail } from './actions'
import { toast } from 'sonner'

interface SendEmailButtonProps {
  userId: string
  displayName: string
}

export function SendEmailButton({ userId, displayName }: SendEmailButtonProps) {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setSubject('')
    setBody('')
    setError('')
  }

  function handleSend() {
    if (!subject.trim()) { setError('Subject is required'); return }
    if (!body.trim()) { setError('Message body is required'); return }
    setError('')
    startTransition(async () => {
      const result = await sendDirectEmail(userId, subject, body)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(`Email sent to ${displayName}`)
      close()
    })
  }

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-white">Email {displayName}</h3>
              <p className="text-xs text-zinc-500 mt-1">Sent from hello@18thman.app</p>
            </div>
            <button onClick={close} disabled={isPending} className="text-zinc-600 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Following up on your session plan"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Message <span className="text-zinc-600 normal-case font-normal">(HTML allowed)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="Write your message here. You can use <strong>, <a>, <br>, <ul>, <li> tags."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {isPending ? 'Sending…' : 'Send email'}
            </button>
            <button
              onClick={close}
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
      onClick={() => setOpen(true)}
      className="p-1.5 rounded-lg text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
      title={`Email ${displayName}`}
    >
      <Mail size={14} />
    </button>
  )
}
```

- [ ] **Step 2: Wire `SendEmailButton` into `UsersTable.tsx`**

In `web/src/app/(app)/admin/users/UsersTable.tsx`:

1. Add the import after the existing `DeleteUserButton` import (line 7):

```ts
import { SendEmailButton } from './SendEmailButton'
```

2. Add a new header cell after the existing "Notes" header (after line 266, before the Delete `<th className="px-5 py-3" />` on line 267):

```tsx
              <th className="px-3 py-3" />
```

3. Update the empty-state `colSpan` on line 273 from `cols.length + 3` to `cols.length + 4`.

4. Add a new `<td>` after the Notes `<td>` block (after line 329, before the existing Delete `<td>` on line 331):

```tsx
                  {/* Send email */}
                  <td className="px-3 py-3.5">
                    <SendEmailButton
                      userId={profile.id}
                      displayName={profile.display_name ?? profile.username ?? 'this user'}
                    />
                  </td>
```

- [ ] **Step 3: Manual verification**

Run: `cd web && npm run dev`, sign in as an admin, open `/admin/users`. Confirm:
- A mail icon appears on every row (including your own).
- Clicking it opens the compose modal with subject/body fields.
- Submitting with an empty subject or body shows the inline error and does not call the server action (no network request with empty fields — verify in devtools).
- With `RESEND_API_KEY` unset locally, submitting a valid subject/body shows the "RESEND_API_KEY not configured" error inline (confirms the error path renders correctly end-to-end).

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/users/SendEmailButton.tsx" "web/src/app/(app)/admin/users/UsersTable.tsx"
git commit -m "feat(admin): add per-user send-email action to admin/users table"
```

---

### Task 4: Surface direct emails in the Transactional tab

**Files:**
- Modify: `web/src/app/(app)/admin/email/page.tsx`

**Interfaces:**
- Consumes: the `category: 'direct_admin'` rows written by Task 2's `sendDirectEmail` action.

- [ ] **Step 1: Add the category to the transactional query filter**

In `web/src/app/(app)/admin/email/page.tsx`, line 71, change:

```ts
    .in('category', ['club_added', 'group_added'])
```

to:

```ts
    .in('category', ['club_added', 'group_added', 'direct_admin'])
```

- [ ] **Step 2: Add the display label**

In the same file, line 86-89, change:

```ts
  const TRANSACTIONAL_LABELS: Record<string, string> = {
    club_added: 'Added to Club',
    group_added: 'Added to Group',
  }
```

to:

```ts
  const TRANSACTIONAL_LABELS: Record<string, string> = {
    club_added: 'Added to Club',
    group_added: 'Added to Group',
    direct_admin: 'Direct Email',
  }
```

- [ ] **Step 3: Manual verification**

After completing Task 3's manual verification (which requires a configured `RESEND_API_KEY` to produce a real send), reload `/admin/email?tab=transactional` and confirm the sent direct email appears with the "Direct Email" badge.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/email/page.tsx"
git commit -m "feat(admin): show direct admin emails in the transactional tab"
```
