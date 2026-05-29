# Email Campaign Live Preview Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live side-by-side email preview pane to the admin campaign review page so admins can see the rendered email as they edit.

**Architecture:** Extract the HTML-building logic from `sendCampaignEmailHtml` into a new `buildCampaignEmailHtml` function; expose it via a `POST /api/email-preview` route; add preview state + a 300ms debounced `useEffect` to `CampaignApproveForm` that calls the route and renders the result in an `<iframe srcDoc>`; widen the page layout.

**Tech Stack:** Next.js App Router Route Handler, React `useEffect`/`useState`, `<iframe srcDoc>`, existing `email.ts` template helpers.

---

## File Map

**Modified:**
- `web/src/lib/email.ts` — extract `buildCampaignEmailHtml` (pure HTML builder, no Resend call)
- `web/src/app/api/email-preview/route.ts` — **new** — POST handler calling `buildCampaignEmailHtml`
- `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx` — add preview state, debounce, split layout
- `web/src/app/(app)/admin/email/[id]/page.tsx` — widen `max-w-2xl` → `max-w-6xl`

---

## Task 1: Extract HTML builder + create preview API route

**Files:**
- Modify: `web/src/lib/email.ts`
- Create: `web/src/app/api/email-preview/route.ts`

- [ ] **Step 1: Add `buildCampaignEmailHtml` to `email.ts`**

In `web/src/lib/email.ts`, add this new exported function immediately **before** `sendCampaignEmailHtml` (around line 614). It contains only the HTML-building logic extracted from that function:

```typescript
export function buildCampaignEmailHtml(params: Omit<CampaignEmailParams, 'subject'>): string {
  const ctaSection = params.ctaLabel && params.ctaUrl
    ? ctaButton(params.ctaLabel, params.ctaUrl)
    : ''
  const category = params.category ?? 'announcement'

  const baseHtml = layout(`
    <div style="color:#a1a1aa;font-size:15px;line-height:1.6;">${params.bodyHtml}</div>
    ${ctaSection}
    ${sign()}
  `)

  return baseHtml + `
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr>
      <td align="center" style="padding:8px 16px 0;">
        <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.8;">
          <a href="${SITE_URL}/api/unsubscribe?token=${params.unsubToken}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe from ${category.replace(/_/g, ' ')} emails</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/settings#email-preferences" style="color:#3f3f46;text-decoration:underline;">Manage all email preferences</a>
        </p>
      </td>
    </tr>
  </table>`
}
```

- [ ] **Step 2: Simplify `sendCampaignEmailHtml` to call `buildCampaignEmailHtml`**

Replace the HTML-building block inside `sendCampaignEmailHtml` so it delegates to the new function. The function body becomes:

```typescript
export async function sendCampaignEmailHtml(
  to: string,
  params: CampaignEmailParams,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = buildCampaignEmailHtml(params)

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM,
      to,
      subject: params.subject,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
```

- [ ] **Step 3: Create `web/src/app/api/email-preview/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { buildCampaignEmailHtml } from '@/lib/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.bodyHtml) {
    return NextResponse.json({ error: 'bodyHtml is required' }, { status: 400 })
  }

  const html = buildCampaignEmailHtml({
    bodyHtml: body.bodyHtml,
    ctaLabel: body.ctaLabel || undefined,
    ctaUrl: body.ctaUrl || undefined,
    category: 'announcement',
    unsubToken: 'preview-token',
  })

  return NextResponse.json({ html })
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

Expected: exit 0, no source errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/email.ts web/src/app/api/email-preview/route.ts
git commit -m "feat: extract buildCampaignEmailHtml and add preview API route"
```

---

## Task 2: Add live preview to CampaignApproveForm

**Files:**
- Modify: `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx`

- [ ] **Step 1: Replace the file contents with the split-layout version**

Replace the full contents of `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx`:

```typescript
'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Send, Clock, TestTube, Eye } from 'lucide-react'
import { updateCampaign, sendTestEmail, approveCampaignNow, scheduleCampaign } from '../actions'

interface Campaign {
  id: string
  subject: string
  body_html: string
  cta_label: string | null
  cta_url: string | null
  segment: string
  status: string
  test_sent_at: string | null
  scheduled_at: string | null
}

interface CampaignApproveFormProps {
  campaign: Campaign
  adminEmail: string
  suggestedSchedule: string
}

const SEGMENTS = [
  { value: 'all', label: 'All users' },
  { value: 'coaches', label: 'Coaches only' },
  { value: 'club_admins', label: 'Club admins only' },
  { value: 'free', label: 'Free tier' },
  { value: 'pro', label: 'Pro subscribers' },
]

export function CampaignApproveForm({ campaign, adminEmail, suggestedSchedule }: CampaignApproveFormProps) {
  const [subject, setSubject] = useState(campaign.subject)
  const [body, setBody] = useState(campaign.body_html)
  const [ctaLabel, setCtaLabel] = useState(campaign.cta_label ?? '')
  const [ctaUrl, setCtaUrl] = useState(campaign.cta_url ?? '')
  const [segment, setSegment] = useState(campaign.segment)
  const [scheduledAt, setScheduledAt] = useState(campaign.scheduled_at?.slice(0, 16) ?? suggestedSchedule)
  const [error, setError] = useState('')
  const [testSent, setTestSent] = useState(!!campaign.test_sent_at)
  const [previewHtml, setPreviewHtml] = useState('')
  const [isSaving, startSave] = useTransition()
  const [isTesting, startTest] = useTransition()
  const [isApproving, startApprove] = useTransition()
  const [isScheduling, startSchedule] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch preview HTML with 300ms debounce whenever editable fields change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!body.trim()) { setPreviewHtml(''); return }
      try {
        const res = await fetch('/api/email-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bodyHtml: body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined }),
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewHtml(data.html)
        }
      } catch {
        // Preview fetch failure is non-fatal — just leave the previous preview
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [body, ctaLabel, ctaUrl])

  // Initial preview load on mount
  useEffect(() => {
    if (!body.trim()) return
    fetch('/api/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyHtml: body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.html) setPreviewHtml(data.html) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function save() {
    startSave(async () => {
      const result = await updateCampaign(campaign.id, {
        subject, body_html: body,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        segment,
      })
      if (result.error) setError(result.error)
    })
  }

  function handleTest() {
    startTest(async () => {
      const result = await sendTestEmail(campaign.id, adminEmail)
      if (result.error) { setError(result.error); return }
      setTestSent(true)
    })
  }

  function handleApproveNow() {
    if (!testSent) return
    setError('')
    startApprove(async () => {
      const result = await approveCampaignNow(campaign.id)
      if (result?.error) setError(result.error)
    })
  }

  function handleSchedule() {
    if (!testSent) return
    startSchedule(async () => {
      await scheduleCampaign(campaign.id, new Date(scheduledAt).toISOString())
    })
  }

  void isSaving

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-6 items-start">
      {/* ── Left: edit form ── */}
      <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onBlur={save}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body HTML</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onBlur={save}
            rows={12}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA label</label>
            <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} onBlur={save}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA URL</label>
            <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} onBlur={save}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Segment</label>
          <select value={segment} onChange={e => { setSegment(e.target.value); save() }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500">
            {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            <TestTube size={14} />
            {isTesting ? 'Sending test...' : testSent ? 'Resend test' : 'Send test to me'}
          </button>

          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              disabled={!testSent}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
            />
            <button
              onClick={handleSchedule}
              disabled={!testSent || isScheduling}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-blue-500/40 text-blue-400 hover:border-blue-500/70 transition-colors disabled:opacity-40"
            >
              <Clock size={14} />
              {isScheduling ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>

          <button
            onClick={handleApproveNow}
            disabled={!testSent || isApproving}
            className="flex items-center gap-1.5 text-sm px-5 py-2 rounded-lg bg-[#e8560a] text-white font-semibold hover:bg-[#d04e09] transition-colors disabled:opacity-40"
          >
            <Send size={14} />
            {isApproving ? 'Sending...' : 'Approve & send now'}
          </button>
        </div>
      </div>

      {/* ── Right: live preview ── */}
      <div className="space-y-2 sticky top-6">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email preview</span>
          <span className="text-xs text-zinc-600 ml-1">· Updates as you type</span>
        </div>
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[700px] rounded-xl border border-zinc-800"
            sandbox="allow-same-origin"
            title="Email preview"
          />
        ) : (
          <div className="w-full h-[700px] rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center">
            <p className="text-sm text-zinc-600">Start writing your email to see a preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

Expected: exit 0, no source errors.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx"
git commit -m "feat: add live email preview pane to campaign review form"
```

---

## Task 3: Widen page layout

**Files:**
- Modify: `web/src/app/(app)/admin/email/[id]/page.tsx`

- [ ] **Step 1: Change `max-w-2xl` to `max-w-6xl`**

In `web/src/app/(app)/admin/email/[id]/page.tsx`, find line 47:

```tsx
<div className="max-w-2xl space-y-6">
```

Replace with:

```tsx
<div className="max-w-6xl space-y-6">
```

- [ ] **Step 2: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

Expected: exit 0.

- [ ] **Step 3: Commit and push**

```bash
git add "web/src/app/(app)/admin/email/[id]/page.tsx"
git commit -m "feat: widen campaign review page for split preview layout"
git push origin main
```

---

## Verification

- [ ] Navigate to `/admin/email` → click any campaign
- [ ] Page shows two-column layout: form left, preview right
- [ ] Type in the Body field → preview iframe updates within ~300ms
- [ ] Change CTA label or URL → preview updates
- [ ] Empty body → placeholder "Start writing your email..." message shown
- [ ] All existing buttons (test, schedule, approve) still work
- [ ] TypeScript compiles clean
