# Coach DNA — Admin Data Reset

## Problem

An admin currently has no way to clear a coach's Coach DNA data — their self-assessment attempts and any feedback requested about them — short of deleting the coach's entire account. There's no supported path to give a coach a clean slate (e.g. because they asked for a redo, or test/bad data needs clearing) without destroying their login, club membership, and everything else tied to their profile.

## Scope

1. One combined "Reset Coach DNA data" admin action: deletes a target coach's assessment attempts (and their responses), feedback requests (and their responses/answers/disputes/safeguarding flags/access logs), and clears the cached AI summary fields on `coach_profiles` — everything Coach-DNA-specific, nothing else about the account.
2. A required short reason, captured and written to a new audit log table alongside who did it, to whom, and when — matching the existing precedent (`admin_feedback_access_log`) for logging admin interaction with sensitive feedback data.
3. A new inline button in the existing `/admin/users` roster table, reusing the existing `DeleteUserButton` confirm-modal pattern.

**Out of scope:** any change to the `deleteUser` (full account deletion) flow — this is a narrower, additive action alongside it. No UI for browsing the audit log (a future admin need, not this one). No granular per-table reset (assessment-only or feedback-only) — the approved design is one combined action.

## Part 1: Audit log table

**New migration:** `web/supabase/migrations/121_admin_coach_dna_reset_log.sql` (check `ls web/supabase/migrations | sort | tail -5` at implementation time — other work may have claimed 121 since this spec was written; use the next free number and adjust every reference below accordingly).

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

No insert policy is needed — the reset action always runs through the service-role client (Part 2), which bypasses RLS, matching how `admin_feedback_access_log` rows are written today.

## Part 2: Server Action

**Modify:** `web/src/app/(app)/admin/users/actions.ts` — add alongside the existing `deleteUser`/`updateAdminNote`/etc., reusing the file's existing local `requireAdmin()` helper.

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

Notes:
- `assessment_attempts` deletion cascades `assessment_responses` (migration `086`); `feedback_requests` deletion cascades `feedback_responses` → `feedback_answers` → `safeguarding_flags`, and `response_disputes`/`admin_feedback_access_log` cascade from `feedback_responses` too (confirmed by the explicit cascade-chain comment in migration `120`) — no explicit cleanup needed for any of those child tables.
- `coach_profiles.ai_summary`/`ai_summary_generated_at` are **not** foreign-keyed to attempts, so they're the one place that needs an explicit clear — otherwise a stale cached AI summary would survive with no attempt behind it. If a coach has no `coach_profiles` row yet, the `.update()` matches zero rows and is a harmless no-op, not an error.
- Unlike `deleteUser`, no self-target guard — resetting your own Coach DNA data (e.g. an admin who's also a coach clearing their own test data) is a legitimate, much less consequential action than deleting your own account, and isn't blocked.
- Uses the same inline `createServiceClient(...)` construction the rest of this file already uses (not the shared `@/lib/supabase/service` helper used elsewhere in the Coach DNA module) — for consistency within this specific file, which predates that shared helper.
- If a future migration (from other in-flight work) adds an `ai_feedback_summary`/`ai_feedback_summary_generated_at` pair to `coach_profiles`, extend the `.update()` call to null those too — check the current `coach_profiles` schema at implementation time (`web/supabase/migrations/`, search for `coach_profiles`) rather than assuming this spec's two-column list is still complete.

## Part 3: UI

**New file:** `web/src/app/(app)/admin/users/ResetCoachDnaButton.tsx`

Mirrors `DeleteUserButton.tsx`'s exact structure (client component, `confirming` state, `useTransition`, `sonner` toast) with two differences: a `RotateCcw` icon instead of `Trash2` (visually distinct from full account deletion at a glance, while keeping the same red/warning treatment since this is still irreversible), and a required reason textarea in the confirm modal that keeps the confirm button disabled until non-empty.

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

**Modify:** `web/src/app/(app)/admin/users/UsersTable.tsx` — add one more trailing `<th>` (bumping the header count from 4 to 5, and `colSpan={cols.length + 4}` to `colSpan={cols.length + 5}` on the empty-state row), and one more `<td>` per row, placed after the existing "Delete" column:

```tsx
                  {/* Reset Coach DNA data */}
                  <td className="px-3 py-3.5">
                    <ResetCoachDnaButton
                      userId={profile.id}
                      displayName={profile.display_name ?? profile.username ?? 'this user'}
                    />
                  </td>
```

No conditional hiding (unlike `DeleteUserButton`'s `profile.id !== currentUserId` guard) — every row gets the button, including the admin's own row, per Part 2's no-self-guard decision.

## Testing

- `actions.test.ts` (existing file covering `deleteUser`/`updateAdminNote`): add tests for `resetCoachDnaData` — role-gated (non-admin caller rejected), empty/whitespace-only reason rejected, successful reset deletes from `assessment_attempts`/`feedback_requests` and nulls `coach_profiles` fields, writes exactly one `admin_coach_dna_reset_log` row with the given `admin_id`/`coach_id`/`reason`.
- `ResetCoachDnaButton.tsx`: new test file following `DeleteUserButton`'s existing test conventions if one exists (check at implementation time) — confirm button, then confirm/cancel, then confirm reset is disabled until a reason is typed, then confirm success calls `resetCoachDnaData` with the typed reason and shows a success toast.

## Security

- Every operation runs through the existing `requireAdmin()` gate — same role check every other action in this file already uses.
- Uses the service-role client because deletions span tables not RLS-scoped to admins (most Coach DNA tables' RLS is scoped to the owning coach, not to admin role) — same precedent `deleteUser`/`sendDirectEmail` already establish in this exact file.
- The reason is required and persisted verbatim (trimmed) — no length cap specified elsewhere in this spec; match the existing `admin_user_notes` note-length convention (2000 chars) if a cap is wanted, otherwise leave uncapped as an admin-only, low-volume field.

## Out of scope

- Any UI for viewing `admin_coach_dna_reset_log`'s contents.
- Any change to `deleteUser`'s existing behavior.
- Granular (assessment-only or feedback-only) reset actions.
- A retake-cooldown override UI — the reset action already achieves this side effect by removing the coach's most recent completed attempt (see the companion spec, `2026-08-25-coach-dna-retake-cooldown-design.md`).
