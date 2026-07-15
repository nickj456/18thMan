# Direct Admin → User Email

## Purpose

Admins currently have no way to email a single user directly from the app — only bulk/segment campaigns (`/admin/email`) and automated transactional emails (club/group added, trial, etc.) exist. This adds a lightweight "send email" action per user on `/admin/users`.

## Scope

- Sender: platform admins only (`profiles.role = 'admin'`).
- Recipient: any single user, chosen from the `/admin/users` table.
- Outbound email only — no in-app DM/conversation record is created.
- Text-only compose (subject + rich body). No attachments in v1.
- Reuses the existing `email_sends` log table; no schema migration required.

## UI

- `UsersTable.tsx`: add a mail icon button per row (next to the existing delete action), opening a client-side modal (`SendDirectEmailDialog`).
- Modal fields: recipient name (read-only, prefilled), subject (text input), body (rich-ish editor — same input pattern used by the campaign composer's body field, e.g. a `contentEditable`/basic-formatting textarea — falling back to plain textarea if no shared component exists).
- Submit button disabled until subject + body are non-empty; shows pending/error/success states (loading spinner → toast or inline confirmation) per the repo's "no async UI without loading/empty/error states" rule.

## Backend

**`web/src/app/(app)/admin/users/actions.ts`** (new action, colocated with existing `updateAdminNote`/role actions):

```ts
export async function sendDirectEmail(
  userId: string,
  subject: string,
  bodyHtml: string,
): Promise<{ error?: string }>
```

- Verifies caller is admin (same `assertAdmin`-style guard used in `admin/email/actions.ts` — reuse or duplicate the check).
- Resolves recipient email via `service.auth.admin.getUserById(userId)` (existing pattern in `admin/clubs/actions.ts:105`).
- Resolves recipient display name from `profiles` for the email greeting.
- Calls `sendDirectEmailHtml(email, displayName, subject, bodyHtml)` from `web/src/lib/email.ts`.
- On success, inserts into `email_sends`: `{ user_id: userId, category: 'direct_admin', resend_message_id }`.
- Returns `{ error }` on failure (Resend not configured, send error), so the modal can surface it.

**`web/src/lib/email.ts`** (new function, mirroring `sendClubAddedEmail`):

```ts
export async function sendDirectEmailHtml(
  to: string,
  displayName: string,
  subject: string,
  bodyHtml: string,
): Promise<EmailResultWithId>
```

- Wraps `bodyHtml` in the existing branded `layout()` template with `heading(subject)` + `greeting(displayName)` + the body + `sign()`.
- Sends via Resend using the same `FROM` address as other transactional email.

## Visibility

`web/src/app/(app)/admin/email/page.tsx`: add `direct_admin: 'Direct Message'` to `TRANSACTIONAL_LABELS` and include `'direct_admin'` in the `.in('category', [...])` filter for the Transactional tab query, so sent emails are auditable there.

## Testing

- `email.test.ts`: unit test `sendDirectEmailHtml` with mocked Resend (success + `RESEND_API_KEY` missing paths).
- `admin/users/actions.test.ts`: test `sendDirectEmail` rejects non-admin callers (regression per repo convention — every conditional gets both branches tested), and test the happy path logs to `email_sends`.

## Non-goals

- No reply-to-app threading, no rich attachments, no scheduling — this is a simple synchronous send, matching the weight of the feature.
