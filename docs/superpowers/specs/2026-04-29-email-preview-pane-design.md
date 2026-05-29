# Email Campaign Live Preview Pane — Design
**Date:** 2026-04-29
**Status:** Approved

---

## Context

The admin campaign review page (`/admin/email/[id]`) currently shows the edit form in a single full-width column. Admins must send a test email to see how the email will look. This spec adds a live preview pane so the rendered email is visible alongside the editor at all times — updating as the admin types.

---

## Architecture

Two additions:

### 1. Preview API Route

**`POST /api/email-preview`**

Accepts `{ subject, bodyHtml, ctaLabel?, ctaUrl? }` and returns `{ html: string }` — the fully rendered email HTML using the existing `sendCampaignEmailHtml` template from `web/src/lib/email.ts`.

- No authentication required (template rendering only, no data reads/writes)
- Uses a placeholder unsubscribe token for preview purposes
- Returns 400 if bodyHtml is missing

### 2. CampaignApproveForm — Split Layout

The form component gains:

- **`previewHtml` state** — the rendered HTML string for the iframe
- **`useEffect` with 300ms debounce** watching subject, body, ctaLabel, ctaUrl — calls `/api/email-preview` on change and updates `previewHtml`
- **2-column grid layout** — form fields left, preview panel right
- **`<iframe srcDoc={previewHtml}>`** — safely sandboxes the email HTML, matches the form height

---

## Layout Change

| Before | After |
|---|---|
| `max-w-2xl` single column | `max-w-6xl` two-column `grid grid-cols-[1fr_1fr] gap-6` |

The preview panel:
- Header: "Email preview" label + "Updates as you type" hint text
- `<iframe>` at fixed height (e.g. `h-[700px]`) with `w-full rounded-xl border border-zinc-800`
- Shows placeholder text ("Start writing your email...") when `previewHtml` is empty

---

## Files

| File | Change |
|---|---|
| `web/src/app/api/email-preview/route.ts` | Create — POST handler |
| `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx` | Modify — add preview state, debounce effect, split layout |
| `web/src/app/(app)/admin/email/[id]/page.tsx` | Modify — widen `max-w-2xl` to `max-w-6xl` |

---

## Verification

- Edit the subject or body on any campaign — preview iframe updates within ~300ms
- CTA button and unsubscribe footer visible in preview
- Preview shows branded dark-theme email (logo, correct fonts, orange CTA)
- Page still functions correctly on narrower screens (form remains usable)
- TypeScript compiles clean
