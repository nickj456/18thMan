# Email Personalisation, Image Upload & PDF Attachments

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `{{name}}` personalisation to campaign emails, an in-editor image upload button, and PDF attachments (uploaded file or generated session plan).

**Architecture:** Three independent additions sharing one DB migration. Images are uploaded to a Supabase `email-assets` storage bucket via an admin API route and inserted as `<img>` tags at cursor. PDFs are stored in the same bucket (uploaded or generated from session plans) and their URLs saved in a new `attachments` JSONB column on `email_campaigns`. At send time `sendCampaign` fetches each PDF as a buffer and passes it to Resend.

**Tech Stack:** Supabase Storage, `@react-pdf/renderer` (existing), Resend attachments API (existing pattern in `sendLeadMagnetEmail`), Next.js Route Handler for upload, React textarea cursor manipulation.

---

## File Map

**New files:**
- `web/supabase/migrations/054_email_campaign_attachments.sql`
- `web/src/app/api/admin/email-assets/upload/route.ts` — image + PDF file upload endpoint
- `web/src/app/api/admin/session-plan-pdf/route.ts` — generates session plan PDF for email attachment

**Modified files:**
- `web/src/lib/email-campaigns.ts` — `{{name}}` replacement + attachment sending in `sendCampaign`
- `web/src/app/api/email-preview/route.ts` — replace `{{name}}` with "Coach" in preview
- `web/src/app/(app)/admin/email/actions.ts` — add `updateCampaignAttachments` server action
- `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx` — image button + PDF panel

---

## Task 1: DB Migration — attachments column + email-assets bucket

**Files:**
- Create: `web/supabase/migrations/054_email_campaign_attachments.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add attachments column to email_campaigns
-- Each attachment: { type: 'file'|'session_plan', url: string, filename: string }
alter table public.email_campaigns
  add column if not exists attachments jsonb not null default '[]';

-- Create email-assets storage bucket (public read, admin write)
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do nothing;

create policy "Public read email assets"
  on storage.objects for select
  using (bucket_id = 'email-assets');

create policy "Admins can upload email assets"
  on storage.objects for insert
  with check (
    bucket_id = 'email-assets' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete email assets"
  on storage.objects for delete
  using (
    bucket_id = 'email-assets' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

- [ ] **Step 2: Apply migration**

```bash
cd web && npx supabase db push
```
Expected: `Applying migration 054_email_campaign_attachments.sql... done`

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/054_email_campaign_attachments.sql
git commit -m "feat: add attachments column to email_campaigns and email-assets storage bucket"
```

---

## Task 2: {{name}} personalisation

**Files:**
- Modify: `web/src/lib/email-campaigns.ts`
- Modify: `web/src/app/api/email-preview/route.ts`

- [ ] **Step 1: Add {{name}} replacement to `sendCampaign` in `email-campaigns.ts`**

In the `sendCampaign` function, after fetching the auth user email and before building/sending the email, add display_name lookup and replacement. Find the loop body (inside `for (const profileId of profileIds)`) and add display_name resolution:

```typescript
// After: const { data: authUser } = await service.auth.admin.getUserById(profileId)
// After: const email = authUser?.user?.email
// Add:

const { data: profile } = await service
  .from('profiles')
  .select('display_name')
  .eq('id', profileId)
  .single()
const displayName = profile?.display_name || 'Coach'

// Replace {{name}} in body before sending
const personalizedBody = campaign.body_html.replace(/\{\{name\}\}/g, displayName)
```

Then update the `sendCampaignEmailHtml` call to use `personalizedBody` instead of `campaign.body_html`:

```typescript
const result = await sendCampaignEmailHtml(email, {
  subject: campaign.subject,
  bodyHtml: personalizedBody,   // ← was campaign.body_html
  ctaLabel: campaign.cta_label ?? undefined,
  ctaUrl: campaign.cta_url ?? undefined,
  category,
  unsubToken,
})
```

- [ ] **Step 2: Replace {{name}} with "Coach" in preview route**

In `web/src/app/api/email-preview/route.ts`, replace `{{name}}` before calling `buildCampaignEmailHtml`:

```typescript
// After parsing body, before buildCampaignEmailHtml:
const previewBody = (body.bodyHtml as string).replace(/\{\{name\}\}/g, 'Coach')

const html = buildCampaignEmailHtml({
  bodyHtml: previewBody,   // ← was body.bodyHtml
  ctaLabel: body.ctaLabel || undefined,
  ctaUrl: body.ctaUrl || undefined,
  category: 'announcement',
  unsubToken: 'preview-token',
})
```

- [ ] **Step 3: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/email-campaigns.ts web/src/app/api/email-preview/route.ts
git commit -m "feat: add {{name}} personalisation to campaign emails and preview"
```

---

## Task 3: File upload API route (images + PDFs)

**Files:**
- Create: `web/src/app/api/admin/email-assets/upload/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_PDF_TYPE = 'application/pdf'

export async function POST(request: Request) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isPdf = file.type === ALLOWED_PDF_TYPE
  if (!isImage && !isPdf) {
    return NextResponse.json({ error: 'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? (isPdf ? 'pdf' : 'jpg')
  const folder = isPdf ? 'pdfs' : 'images'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const service = createServiceClient()

  const { error: uploadError } = await service.storage
    .from('email-assets')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = service.storage.from('email-assets').getPublicUrl(path)

  return NextResponse.json({
    url: urlData.publicUrl,
    filename: file.name,
    type: isPdf ? 'pdf' : 'image',
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/admin/email-assets/upload/route.ts
git commit -m "feat: admin file upload API route for email images and PDFs"
```

---

## Task 4: Session plan PDF generation route

**Files:**
- Create: `web/src/app/api/admin/session-plan-pdf/route.ts`

- [ ] **Step 1: Create session plan PDF generator for email attachment**

This generates a session plan PDF and uploads it to `email-assets` storage, returning the public URL. Reuses the existing `SessionPlanPDF` component and `renderToBuffer`.

```typescript
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SessionPlanPDF } from '@/components/session/SessionPlanPDF'
import type { SessionDrillItem, AiGuide } from '@/lib/supabase/types'
import React from 'react'

export async function POST(request: Request) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body?.sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

  const service = createServiceClient()

  const { data: session } = await service
    .from('session_plans')
    .select('*')
    .eq('id', body.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session plan not found' }, { status: 404 })

  const sessionItems = (session.drills_order ?? []) as SessionDrillItem[]
  const drillIds = sessionItems.filter(d => d.drill_id).map(d => d.drill_id!)

  const drillsMap = new Map<string, {
    id: string; title: string; description: string | null
    difficulty: string | null; age_group: string | null
    player_count: string | null; canvas_preview_url: string | null
    ai_guide: AiGuide | null
  }>()

  if (drillIds.length > 0) {
    const { data: drills } = await service
      .from('drills')
      .select('id, title, description, difficulty, age_group, player_count, canvas_preview_url, ai_guide')
      .in('id', drillIds)
    for (const drill of drills ?? []) {
      drillsMap.set(drill.id, { ...drill, ai_guide: (drill.ai_guide as AiGuide | null) ?? null })
    }
  }

  const { data: coachProfile } = await service
    .from('profiles')
    .select('display_name, club')
    .eq('id', session.coach_id)
    .single()

  const coach = coachProfile ?? { display_name: null, club: null }

  const buffer = await renderToBuffer(
    React.createElement(SessionPlanPDF, { session, drillsMap, coach })
  )

  const filename = `${session.title ?? 'session-plan'}.pdf`
    .toLowerCase().replace(/[^a-z0-9.-]/g, '-')
  const path = `pdfs/session-${session.id}-${Date.now()}.pdf`

  const { error: uploadError } = await service.storage
    .from('email-assets')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = service.storage.from('email-assets').getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl, filename })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/admin/session-plan-pdf/route.ts
git commit -m "feat: session plan PDF generator for email attachment"
```

---

## Task 5: Attachment server action + sendCampaign update

**Files:**
- Modify: `web/src/app/(app)/admin/email/actions.ts`
- Modify: `web/src/lib/email-campaigns.ts`

- [ ] **Step 1: Add `updateCampaignAttachments` to `actions.ts`**

Add after the existing `cancelCampaign` function:

```typescript
export interface EmailAttachment {
  type: 'file' | 'session_plan'
  url: string
  filename: string
}

export async function updateCampaignAttachments(
  campaignId: string,
  attachments: EmailAttachment[],
): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ attachments })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}
```

- [ ] **Step 2: Update `sendCampaign` to send attachments**

In `web/src/lib/email-campaigns.ts`, update the send call inside the user loop to handle attachments.

First, before the user loop, fetch campaign attachments and build the Resend attachment objects:

```typescript
// After fetching campaign, before the profileIds loop:
const campaignAttachments = (campaign.attachments ?? []) as Array<{
  type: string; url: string; filename: string
}>

// Build Resend attachment buffers
const resendAttachments: { filename: string; content: Buffer }[] = []
for (const att of campaignAttachments) {
  try {
    const res = await fetch(att.url)
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      resendAttachments.push({ filename: att.filename, content: buf })
    }
  } catch (err) {
    console.error('[sendCampaign] failed to fetch attachment:', att.url, err)
  }
}
```

Then update the `sendCampaignEmailHtml` call to pass attachments. Since `sendCampaignEmailHtml` doesn't currently support attachments, call Resend directly when there are attachments, otherwise use the existing helper:

```typescript
// Replace the existing result assignment with:
let result: { success: boolean; error?: string; messageId?: string }

if (resendAttachments.length > 0) {
  // Use Resend directly to support attachments
  const { Resend } = await import('resend')
  const resendClient = new Resend(process.env.RESEND_API_KEY)
  const html = buildCampaignEmailHtml({
    bodyHtml: personalizedBody,
    ctaLabel: campaign.cta_label ?? undefined,
    ctaUrl: campaign.cta_url ?? undefined,
    category,
    unsubToken,
  })
  const { data, error } = await resendClient.emails.send({
    from: '18th Man <no-reply@18thman.app>',
    to: email,
    subject: campaign.subject,
    html,
    attachments: resendAttachments,
  })
  result = error
    ? { success: false, error: error.message }
    : { success: true, messageId: data?.id }
} else {
  result = await sendCampaignEmailHtml(email, {
    subject: campaign.subject,
    bodyHtml: personalizedBody,
    ctaLabel: campaign.cta_label ?? undefined,
    ctaUrl: campaign.cta_url ?? undefined,
    category,
    unsubToken,
  })
}
```

Also add `buildCampaignEmailHtml` to the imports at the top of `email-campaigns.ts`:

```typescript
import { generateUnsubscribeToken } from '@/lib/email-notifications'
import { sendCampaignEmailHtml, buildCampaignEmailHtml } from '@/lib/email'
```

- [ ] **Step 3: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/(app)/admin/email/actions.ts web/src/lib/email-campaigns.ts
git commit -m "feat: email attachment sending and updateCampaignAttachments server action"
```

---

## Task 6: Image upload button + PDF attachment UI in CampaignApproveForm

**Files:**
- Modify: `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx`

- [ ] **Step 1: Read the current CampaignApproveForm.tsx**

Read `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx` in full before editing.

- [ ] **Step 2: Add imports, refs, and state**

Add to imports:
```typescript
import { ImagePlus, Paperclip, X, FileText, BookOpen } from 'lucide-react'
import { updateCampaignAttachments } from '../actions'
import type { EmailAttachment } from '../actions'
```

Add after existing state declarations:
```typescript
const [attachments, setAttachments] = useState<EmailAttachment[]>(
  (campaign as Campaign & { attachments?: EmailAttachment[] }).attachments ?? []
)
const [isUploading, setIsUploading] = useState(false)
const [attachmentError, setAttachmentError] = useState('')
const [showSessionPicker, setShowSessionPicker] = useState(false)
const [sessionPlans, setSessionPlans] = useState<{ id: string; title: string }[]>([])
const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
const bodyRef = useRef<HTMLTextAreaElement>(null)
const imageInputRef = useRef<HTMLInputElement>(null)
const pdfInputRef = useRef<HTMLInputElement>(null)
```

Update the `Campaign` interface to include attachments:
```typescript
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
  attachments?: EmailAttachment[]
}
```

- [ ] **Step 3: Add upload handler functions**

Add after `handleDelete`:
```typescript
async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  setIsUploading(true)
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/email-assets/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setAttachmentError(data.error ?? 'Upload failed'); return }
    // Insert <img> tag at cursor
    const textarea = bodyRef.current
    const tag = `<img src="${data.url}" alt="${file.name.replace(/\.[^.]+$/, '')}" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:10px;margin:0 0 16px;" />`
    if (textarea) {
      const start = textarea.selectionStart ?? body.length
      const end = textarea.selectionEnd ?? body.length
      const newBody = body.slice(0, start) + tag + body.slice(end)
      setBody(newBody)
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tag.length
        textarea.focus()
      })
    } else {
      setBody(prev => prev + '\n' + tag)
    }
  } catch {
    setAttachmentError('Image upload failed')
  } finally {
    setIsUploading(false)
    e.target.value = ''
  }
}

async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (attachments.length >= 2) { setAttachmentError('Maximum 2 attachments'); return }
  setIsUploading(true)
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/email-assets/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setAttachmentError(data.error ?? 'Upload failed'); return }
    const newAttachments = [...attachments, { type: 'file' as const, url: data.url, filename: file.name }]
    setAttachments(newAttachments)
    await updateCampaignAttachments(campaign.id, newAttachments)
  } catch {
    setAttachmentError('PDF upload failed')
  } finally {
    setIsUploading(false)
    e.target.value = ''
  }
}

async function loadSessionPlans() {
  setShowSessionPicker(true)
  if (sessionPlans.length > 0) return
  const res = await fetch('/api/admin/session-plans')
  if (res.ok) {
    const data = await res.json()
    setSessionPlans(data.sessions ?? [])
  }
}

async function attachSessionPlan(sessionId: string, title: string) {
  if (attachments.length >= 2) { setAttachmentError('Maximum 2 attachments'); return }
  setIsGeneratingPdf(true)
  setShowSessionPicker(false)
  try {
    const res = await fetch('/api/admin/session-plan-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    const data = await res.json()
    if (!res.ok) { setAttachmentError(data.error ?? 'PDF generation failed'); return }
    const newAttachments = [...attachments, { type: 'session_plan' as const, url: data.url, filename: data.filename }]
    setAttachments(newAttachments)
    await updateCampaignAttachments(campaign.id, newAttachments)
  } catch {
    setAttachmentError('Failed to generate PDF')
  } finally {
    setIsGeneratingPdf(false)
  }
}

async function removeAttachment(index: number) {
  const newAttachments = attachments.filter((_, i) => i !== index)
  setAttachments(newAttachments)
  await updateCampaignAttachments(campaign.id, newAttachments)
}
```

- [ ] **Step 4: Update textarea to use bodyRef**

Find the textarea element and add `ref={bodyRef}`:
```tsx
<textarea
  ref={bodyRef}
  value={body}
  onChange={e => setBody(e.target.value)}
  onBlur={save}
  rows={12}
  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono resize-y"
/>
```

- [ ] **Step 5: Add toolbar above textarea and attachment panel below segment picker**

Replace the body HTML field section with:
```tsx
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body HTML</label>
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-600">Use <code className="text-zinc-500">{'{{name}}'}</code> for recipient's name</span>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
      >
        <ImagePlus size={12} />
        {isUploading ? 'Uploading...' : 'Insert image'}
      </button>
    </div>
  </div>
  <textarea
    ref={bodyRef}
    value={body}
    onChange={e => setBody(e.target.value)}
    onBlur={save}
    rows={12}
    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono resize-y"
  />
</div>
```

Add attachment panel after the segment picker, before the error display:
```tsx
{/* ── PDF Attachments ── */}
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
      Attachments <span className="text-zinc-600 normal-case font-normal">(PDF · max 2)</span>
    </label>
    {attachments.length < 2 && (
      <div className="flex items-center gap-2 relative">
        <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          disabled={isUploading || isGeneratingPdf}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <Paperclip size={12} />
          Upload PDF
        </button>
        <button
          type="button"
          onClick={loadSessionPlans}
          disabled={isUploading || isGeneratingPdf}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          <BookOpen size={12} />
          {isGeneratingPdf ? 'Generating...' : 'Coaching plan'}
        </button>
        {showSessionPicker && (
          <div className="absolute right-0 top-8 z-10 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 space-y-1">
            <p className="text-xs text-zinc-500 px-2 py-1">Select a session plan:</p>
            {sessionPlans.length === 0 && (
              <p className="text-xs text-zinc-600 px-2 py-2">No session plans found</p>
            )}
            {sessionPlans.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => attachSessionPlan(s.id, s.title)}
                className="w-full text-left text-sm text-zinc-300 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors truncate"
              >
                {s.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSessionPicker(false)}
              className="w-full text-xs text-zinc-600 px-3 py-1.5 hover:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    )}
  </div>
  {attachmentError && <p className="text-xs text-red-400">{attachmentError}</p>}
  {attachments.length === 0 ? (
    <p className="text-xs text-zinc-600">No attachments</p>
  ) : (
    <div className="space-y-1.5">
      {attachments.map((att, i) => (
        <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-zinc-500 flex-shrink-0" />
            <span className="text-xs text-zinc-300 truncate">{att.filename}</span>
            {att.type === 'session_plan' && (
              <span className="text-xs text-sky-400 flex-shrink-0">Coaching plan</span>
            )}
          </div>
          <button type="button" onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 6: Create session plans list API for the picker**

Create `web/src/app/api/admin/session-plans/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: sessions } = await service
    .from('session_plans')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ sessions: sessions ?? [] })
}
```

- [ ] **Step 7: TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | grep -v ".next/" | head -10
```

- [ ] **Step 8: Commit**

```bash
git add "web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx" web/src/app/api/admin/session-plans/route.ts
git commit -m "feat: image upload button and PDF attachment UI in campaign editor"
```

---

## Verification

- [ ] Type `{{name}}` in a campaign body — preview shows "Coach"
- [ ] Approve and send a campaign — `{{name}}` replaced with each user's display name
- [ ] Click "Insert image" → pick a file → `<img>` tag appears at cursor in textarea → preview updates with image
- [ ] Click "Upload PDF" → pick a file → appears in attachments list with remove button
- [ ] Click "Coaching plan" → session picker dropdown appears → pick one → "Generating..." → appears in list
- [ ] Can't add more than 2 attachments
- [ ] Send a test email — PDF(s) arrive as email attachments
- [ ] TypeScript compiles clean
