# Email & Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add notification emails with rate-limiting, a campaign email system with admin approval queue, and granular user email preferences — all built on existing Resend + Supabase infrastructure.

**Architecture:** Three systems share the Resend + Supabase foundation. Notification emails fire immediately on in-app notification creation with a burst rate-limiter. Campaign emails are auto-drafted from app events or admin-composed, then live in an admin approval queue before sending. User preferences (stored as opt-out rows) gate both systems.

**Tech Stack:** Resend (existing), Supabase Postgres + RLS (existing), Next.js App Router Server Actions, Node.js `crypto` for HMAC unsubscribe tokens, Vercel Cron.

---

## File Map

**New files:**
- `web/supabase/migrations/052_email_system.sql`
- `web/src/lib/email-notifications.ts` — unsubscribe tokens, rate limiting, notification email dispatch
- `web/src/lib/email-campaigns.ts` — auto-draft creation, batch logic, campaign send
- `web/src/components/settings/EmailPreferences.tsx` — client component for preferences UI
- `web/src/app/api/unsubscribe/route.ts` — one-click unsubscribe (public, no auth)
- `web/src/app/api/cron/send-campaigns/route.ts` — scheduled campaign sender
- `web/src/app/(app)/admin/email/page.tsx` — campaign queue (drafts / scheduled / sent tabs)
- `web/src/app/(app)/admin/email/compose/page.tsx` — compose new campaign
- `web/src/app/(app)/admin/email/[id]/page.tsx` — review / edit / approve campaign
- `web/src/app/(app)/admin/email/settings/page.tsx` — batch thresholds + burst config
- `web/src/app/(app)/admin/email/actions.ts` — all campaign Server Actions

**Modified files:**
- `web/src/lib/email.ts` — add `campaignLayout()`, `unsubscribeFooter()`, campaign template helpers
- `web/src/lib/notifications.ts` — trigger email side-effect after notification insert
- `web/src/app/(app)/settings/page.tsx` — add `<EmailPreferences />` section
- `web/src/app/(app)/admin/drills/actions.ts` — add auto-draft trigger on drill approval
- `web/vercel.json` — add send-campaigns cron

---

## Task 1: Database Migration

**Files:**
- Create: `web/supabase/migrations/052_email_system.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 052_email_system.sql

-- ── email_preferences ──────────────────────────────────────────────────────────
create table public.email_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);
create index email_preferences_user_id_idx on public.email_preferences(user_id);
alter table public.email_preferences enable row level security;
create policy "Users can manage own email preferences"
  on public.email_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── email_campaigns ────────────────────────────────────────────────────────────
create table public.email_campaigns (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,           -- 'auto_draft' | 'admin_composed'
  trigger_type    text not null,           -- 'new_public_drill' | 'weekly_focus' | 'podcast' | 'wellbeing' | 'announcement' | 'poll'
  subject         text not null default '',
  body_html       text not null default '',
  cta_label       text,
  cta_url         text,
  segment         text not null default 'all', -- 'all' | 'coaches' | 'club_admins' | 'free' | 'pro'
  status          text not null default 'draft', -- 'draft' | 'ready' | 'scheduled' | 'sent' | 'cancelled'
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  created_by      uuid references public.profiles(id),
  test_sent_at    timestamptz,
  resend_batch_id text,
  created_at      timestamptz not null default now()
);
create index email_campaigns_status_idx on public.email_campaigns(status, scheduled_at);
create index email_campaigns_trigger_type_status_idx on public.email_campaigns(trigger_type, status);
alter table public.email_campaigns enable row level security;
create policy "Admins can manage email campaigns"
  on public.email_campaigns for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── email_campaign_items ───────────────────────────────────────────────────────
create table public.email_campaign_items (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  item_type   text not null,  -- 'drill' | 'podcast' | 'wellbeing'
  item_id     uuid not null,
  item_title  text not null,
  item_url    text not null,
  created_at  timestamptz not null default now()
);
create index email_campaign_items_campaign_id_idx on public.email_campaign_items(campaign_id);
alter table public.email_campaign_items enable row level security;
create policy "Admins can manage campaign items"
  on public.email_campaign_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── email_sends ────────────────────────────────────────────────────────────────
create table public.email_sends (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id),
  campaign_id       uuid references public.email_campaigns(id),
  notification_id   uuid references public.notifications(id),
  category          text not null,
  sent_at           timestamptz not null default now(),
  resend_message_id text
);
create index email_sends_user_id_idx on public.email_sends(user_id, sent_at desc);
create index email_sends_campaign_id_idx on public.email_sends(campaign_id);
alter table public.email_sends enable row level security;
create policy "Admins can view email sends"
  on public.email_sends for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── notification_email_log ─────────────────────────────────────────────────────
create table public.notification_email_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  sent_at          timestamptz not null default now(),
  notification_ids uuid[] not null default '{}',
  is_burst         boolean not null default false
);
create index notification_email_log_user_sent_idx on public.notification_email_log(user_id, sent_at desc);
alter table public.notification_email_log enable row level security;
-- Service role only — no user-facing policies needed

-- ── email_settings ─────────────────────────────────────────────────────────────
-- Single-row config table for admin-configurable thresholds
create table public.email_settings (
  id                       uuid primary key default gen_random_uuid(),
  burst_threshold          int not null default 3,
  burst_window_minutes     int not null default 5,
  batch_threshold_drill    int not null default 5,
  batch_threshold_podcast  int not null default 3,
  batch_threshold_wellbeing int not null default 3,
  updated_at               timestamptz not null default now()
);
-- Seed with defaults
insert into public.email_settings (id) values (gen_random_uuid());
alter table public.email_settings enable row level security;
create policy "Admins can manage email settings"
  on public.email_settings for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Apply the migration**

Run from `web/`:
```bash
npx supabase db push
```
Expected: `Applying migration 052_email_system.sql... done`

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/052_email_system.sql
git commit -m "feat: add email system database tables"
```

---

## Task 2: Unsubscribe Token Helpers + Notification Email Helpers

**Files:**
- Create: `web/src/lib/email-notifications.ts`
- Modify: `web/src/lib/email.ts` — add `unsubscribeFooter()` and notification email templates

- [ ] **Step 1: Read the notifications page to confirm data shapes**

```bash
cat "web/src/app/(app)/notifications/page.tsx"
```
Note the `data` field shape for each notification type (senderName, drillTitle, etc.) — use them in Step 3.

- [ ] **Step 2: Create `web/src/lib/email-notifications.ts`**

```typescript
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendNotificationEmailHtml, sendBurstEmailHtml } from '@/lib/email'

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? 'dev-fallback-secret'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

// ── Unsubscribe tokens ─────────────────────────────────────────────────────────

export function generateUnsubscribeToken(userId: string, category: string): string {
  const ts = Date.now().toString()
  const payload = [userId, category, ts].join(':')
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): { userId: string; category: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 4) return null
    const [userId, category, ts, sig] = parts
    if (Date.now() - parseInt(ts) > 90 * 24 * 60 * 60 * 1000) return null
    const payload = [userId, category, ts].join(':')
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return null
    return { userId, category }
  } catch {
    return null
  }
}

// ── Category mapping ───────────────────────────────────────────────────────────

export const NOTIFICATION_CATEGORY: Record<string, string> = {
  new_dm: 'dm',
  drill_rating: 'drill_rating',
  club_invite: 'club_invite',
  group_invite: 'club_invite',
  followed_you: 'new_follower',
  session_scheduled: 'session_scheduled',
  new_drill: 'new_public_drill',
}

export const EMAIL_CATEGORY_LABELS: Record<string, string> = {
  dm: 'direct message',
  drill_rating: 'drill rating',
  club_invite: 'club & group invite',
  new_follower: 'follower',
  session_scheduled: 'session',
  weekly_focus: 'weekly focus',
  new_public_drill: 'new drill',
  podcast: 'podcast',
  wellbeing: 'wellbeing resource',
  announcement: 'platform announcement',
}

// ── Email content per notification type ───────────────────────────────────────

export function getNotificationEmailContent(
  type: string,
  data: Record<string, unknown>,
  recipientName: string,
): { subject: string; bodyText: string; ctaLabel: string; ctaPath: string } {
  const name = recipientName || 'Coach'
  switch (type) {
    case 'new_dm':
      return {
        subject: `New message from ${data.senderName ?? 'someone'} — 18th Man`,
        bodyText: `Hi ${name}, you have a new direct message from <strong style="color:#ffffff;">${data.senderName ?? 'someone'}</strong> on 18th Man.`,
        ctaLabel: 'Read your message',
        ctaPath: '/chat',
      }
    case 'drill_rating':
      return {
        subject: `Your drill received a new rating — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.raterName ?? 'A coach'}</strong> left a rating on your drill <strong style="color:#ffffff;">${data.drillTitle ?? 'your drill'}</strong>.`,
        ctaLabel: 'View your drill',
        ctaPath: data.drillId ? `/drills/${data.drillId}` : '/drills',
      }
    case 'club_invite':
      return {
        subject: `You've been invited to join ${data.clubName ?? 'a club'} — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.inviterName ?? 'Someone'}</strong> has invited you to join <strong style="color:#ffffff;">${data.clubName ?? 'a club'}</strong> on 18th Man.`,
        ctaLabel: 'View invitation',
        ctaPath: '/notifications',
      }
    case 'group_invite':
      return {
        subject: `You've been invited to join a coaching group — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.inviterName ?? 'Someone'}</strong> has invited you to join the coaching group <strong style="color:#ffffff;">${data.groupName ?? 'a group'}</strong>.`,
        ctaLabel: 'View invitation',
        ctaPath: '/notifications',
      }
    case 'followed_you':
      return {
        subject: `${data.followerName ?? 'Someone'} is now following you — 18th Man`,
        bodyText: `Hi ${name}, <strong style="color:#ffffff;">${data.followerName ?? 'A coach'}</strong> is now following your profile on 18th Man.`,
        ctaLabel: 'View your profile',
        ctaPath: '/dashboard',
      }
    case 'session_scheduled':
      return {
        subject: `Session scheduled: ${data.sessionTitle ?? 'new session'} — 18th Man`,
        bodyText: `Hi ${name}, a session <strong style="color:#ffffff;">${data.sessionTitle ?? 'has been scheduled'}</strong> has been added to your plan.`,
        ctaLabel: 'View session',
        ctaPath: '/sessions',
      }
    default:
      return {
        subject: `New notification — 18th Man`,
        bodyText: `Hi ${name}, you have a new notification on 18th Man.`,
        ctaLabel: 'Open 18th Man',
        ctaPath: '/dashboard',
      }
  }
}

// ── Preference check ───────────────────────────────────────────────────────────

export async function isUserOptedOut(userId: string, category: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('email_preferences')
    .select('enabled')
    .eq('user_id', userId)
    .eq('category', category)
    .single()
  // Missing row = opted in; row with enabled=false = opted out
  return data?.enabled === false
}

// ── Rate limit check ───────────────────────────────────────────────────────────

export async function getRecentEmailCount(
  userId: string,
  windowMinutes: number,
): Promise<number> {
  const service = createServiceClient()
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { count } = await service
    .from('notification_email_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', since)
  return count ?? 0
}

// ── Main dispatch function ─────────────────────────────────────────────────────

export async function dispatchNotificationEmail(params: {
  userId: string
  notificationId: string
  type: string
  data: Record<string, unknown>
}): Promise<void> {
  const { userId, notificationId, type, data } = params
  const category = NOTIFICATION_CATEGORY[type]
  if (!category) return // Unknown type — skip

  // Check opt-out
  const optedOut = await isUserOptedOut(userId, category)
  if (optedOut) return

  const service = createServiceClient()

  // Get email settings
  const { data: settings } = await service
    .from('email_settings')
    .select('burst_threshold, burst_window_minutes')
    .single()
  const threshold = settings?.burst_threshold ?? 3
  const windowMins = settings?.burst_window_minutes ?? 5

  // Get user email + name
  const { data: authUser } = await service.auth.admin.getUserById(userId)
  const email = authUser?.user?.email
  if (!email) return

  const { data: profile } = await service
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  const displayName = profile?.display_name ?? ''

  // Check rate limit
  const recentCount = await getRecentEmailCount(userId, windowMins)

  if (recentCount >= threshold) {
    // Send burst summary instead of individual email
    const result = await sendBurstEmailHtml(email, displayName, recentCount + 1)
    if (result.success) {
      await service.from('notification_email_log').insert({
        user_id: userId,
        notification_ids: [notificationId],
        is_burst: true,
      })
    }
  } else {
    // Send individual notification email
    const content = getNotificationEmailContent(type, data, displayName)
    const unsubToken = generateUnsubscribeToken(userId, category)
    const result = await sendNotificationEmailHtml(email, {
      ...content,
      userId,
      category,
      unsubToken,
    })
    if (result.success) {
      await service.from('notification_email_log').insert({
        user_id: userId,
        notification_ids: [notificationId],
        is_burst: false,
      })
      await service.from('email_sends').insert({
        user_id: userId,
        notification_id: notificationId,
        category,
        resend_message_id: result.messageId ?? null,
      })
    }
  }
}
```

- [ ] **Step 3: Add email template helpers to `web/src/lib/email.ts`**

Add these functions at the bottom of `email.ts`, after the existing `sendSubscriptionConfirmationEmail` function:

```typescript
// ── Unsubscribe footer (added to all notification + campaign emails) ────────────

export function unsubscribeFooter(userId: string, category: string, unsubToken: string): string {
  const categoryLabel = category.replace(/_/g, ' ')
  return `
    <tr>
      <td align="center" style="padding-top:20px;border-top:1px solid #2a2a2a;margin-top:24px;">
        <p style="margin:0;font-size:11px;color:#3f3f46;line-height:1.8;">
          <a href="${SITE_URL}/api/unsubscribe?token=${unsubToken}" style="color:#3f3f46;text-decoration:underline;">Unsubscribe from ${categoryLabel} emails</a>
          &nbsp;·&nbsp;
          <a href="${SITE_URL}/settings#email-preferences" style="color:#3f3f46;text-decoration:underline;">Manage all email preferences</a>
        </p>
      </td>
    </tr>`
}

// ── Notification emails ────────────────────────────────────────────────────────

export interface NotificationEmailParams {
  subject: string
  bodyText: string
  ctaLabel: string
  ctaPath: string
  userId: string
  category: string
  unsubToken: string
}

export interface EmailResultWithId extends EmailResult {
  messageId?: string
}

export async function sendNotificationEmailHtml(
  to: string,
  params: NotificationEmailParams,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${SITE_URL}/logo.png" alt="18th Man" width="56" height="56" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:40px 40px 36px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;color:#a1a1aa;font-size:15px;line-height:1.6;">${params.bodyText}</p>
              <table cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                <tr>
                  <td style="background:#e8560a;border-radius:10px;">
                    <a href="${SITE_URL}${params.ctaPath}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px;">${params.ctaLabel} →</a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;" />
              <p style="margin:0;font-size:13px;color:#52525b;">The 18th Man team</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                18th Man · Rugby League Coaching Platform<br/>
                <a href="${SITE_URL}" style="color:#52525b;">18thman.app</a>
              </p>
            </td>
          </tr>
          ${unsubscribeFooter(params.userId, params.category, params.unsubToken)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

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

export async function sendBurstEmailHtml(
  to: string,
  displayName: string,
  count: number,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const html = layout(`
    ${heading(`You have ${count} new notifications.`)}
    ${para('A flurry of activity is waiting for you in 18th Man.')}
    ${divider()}
    ${greeting(displayName)}
    ${para(`You've received <strong style="color:#ffffff;">${count} new notifications</strong> in a short space of time. Open the app to see what's happening.`)}
    ${ctaButton('View your notifications', `${SITE_URL}/notifications`)}
    ${sign()}
  `)

  try {
    const { data, error } = await resendClient.emails.send({
      from: FROM,
      to,
      subject: `You have ${count} new notifications — 18th Man`,
      html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Campaign email template ────────────────────────────────────────────────────

export interface CampaignEmailParams {
  subject: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  userId: string
  category?: string
  unsubToken: string
}

export async function sendCampaignEmailHtml(
  to: string,
  params: CampaignEmailParams,
): Promise<EmailResultWithId> {
  const resendClient = getResend()
  if (!resendClient) return { success: false, error: 'RESEND_API_KEY not configured' }

  const ctaSection = params.ctaLabel && params.ctaUrl
    ? ctaButton(params.ctaLabel, params.ctaUrl)
    : ''
  const category = params.category ?? 'announcement'

  const html = layout(`
    <div style="color:#a1a1aa;font-size:15px;line-height:1.6;">${params.bodyHtml}</div>
    ${ctaSection}
    ${sign()}
  `) + `
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

- [ ] **Step 4: Add `UNSUBSCRIBE_SECRET` to `.env.local`**

```bash
echo 'UNSUBSCRIBE_SECRET="'$(openssl rand -hex 32)'"' >> web/.env.local
```

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/email-notifications.ts web/src/lib/email.ts web/.env.local
git commit -m "feat: add notification email helpers and unsubscribe token system"
```

---

## Task 3: Hook Notification Creation to Email Dispatch

**Files:**
- Modify: `web/src/lib/notifications.ts`

- [ ] **Step 1: Update `createNotification` to trigger email side-effect**

Replace the entire contents of `web/src/lib/notifications.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotificationEmail } from '@/lib/email-notifications'

type NotificationType =
  | 'drill_rating'
  | 'club_invite'
  | 'group_invite'
  | 'session_scheduled'
  | 'new_dm'
  | 'new_drill'
  | 'followed_you'

interface CreateNotificationOptions {
  userId: string
  type: NotificationType
  data: Record<string, unknown>
}

export async function createNotification(
  supabase: SupabaseClient,
  { userId, type, data }: CreateNotificationOptions,
) {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, data })
    .select('id')
    .single()

  if (error) {
    console.error('[createNotification]', error)
    return
  }

  // Non-blocking email side-effect — never throws
  dispatchNotificationEmail({
    userId,
    notificationId: notification.id,
    type,
    data,
  }).catch(err => console.error('[createNotification email]', err))
}
```

- [ ] **Step 2: Verify the app still compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors (or only pre-existing errors unrelated to this change)

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/notifications.ts
git commit -m "feat: trigger notification email dispatch on createNotification"
```

---

## Task 4: Unsubscribe API Route

**Files:**
- Create: `web/src/app/api/unsubscribe/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUnsubscribeToken } from '@/lib/email-notifications'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse(unsubscribeHtml('Invalid link', 'This unsubscribe link is missing a token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) {
    return new NextResponse(
      unsubscribeHtml('Link expired', 'This unsubscribe link has expired or is invalid. Visit your settings to manage preferences.'),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const { userId, category } = parsed
  const service = createServiceClient()

  await service
    .from('email_preferences')
    .upsert(
      { user_id: userId, category, enabled: false, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,category' },
    )

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'
  const label = category.replace(/_/g, ' ')

  return new NextResponse(
    unsubscribeHtml(
      'Unsubscribed',
      `You've been unsubscribed from <strong>${label}</strong> emails. You can manage all your email preferences in your <a href="${SITE_URL}/settings#email-preferences">settings</a>.`,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

function unsubscribeHtml(title: string, message: string): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — 18th Man</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;padding:40px 32px;background:#161616;border:1px solid #2a2a2a;border-radius:16px;text-align:center;">
    <img src="${SITE_URL}/logo.png" alt="18th Man" width="48" height="48" style="display:block;margin:0 auto 24px;" />
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;">${title}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">${message}</p>
    <a href="${SITE_URL}/settings#email-preferences" style="display:inline-block;padding:12px 24px;background:#e8560a;color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">Manage email preferences →</a>
  </div>
</body>
</html>`
}
```

- [ ] **Step 2: Test the route manually**

Start the dev server (`npm run dev` from `web/`) and visit:
```
http://localhost:3000/api/unsubscribe
```
Expected: HTML page showing "Invalid link — This unsubscribe link is missing a token."

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/unsubscribe/route.ts
git commit -m "feat: one-click unsubscribe API route with signed token verification"
```

---

## Task 5: Email Preferences Server Action + UI

**Files:**
- Create: `web/src/components/settings/EmailPreferences.tsx`
- Modify: `web/src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Create Server Action file**

Create `web/src/app/(app)/settings/email-actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const EMAIL_CATEGORIES = [
  { key: 'dm', label: 'Direct messages', group: 'Notifications' },
  { key: 'drill_rating', label: 'Drill ratings & comments', group: 'Notifications' },
  { key: 'club_invite', label: 'Club & group invites', group: 'Notifications' },
  { key: 'new_follower', label: 'New followers', group: 'Notifications' },
  { key: 'session_scheduled', label: 'Sessions scheduled', group: 'Notifications' },
  { key: 'weekly_focus', label: 'Weekly focus published', group: 'Club & Content' },
  { key: 'new_public_drill', label: 'New public drills', group: 'Club & Content' },
  { key: 'podcast', label: 'New podcast episodes', group: 'Club & Content' },
  { key: 'wellbeing', label: 'New wellbeing resources', group: 'Club & Content' },
  { key: 'announcement', label: 'Feature announcements & polls', group: 'Platform' },
] as const

export type EmailCategoryKey = (typeof EMAIL_CATEGORIES)[number]['key']

export async function saveEmailPreferences(
  prefs: Record<string, boolean>,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rows = Object.entries(prefs).map(([category, enabled]) => ({
    user_id: user.id,
    category,
    enabled,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('email_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}

export async function unsubscribeFromAll(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rows = EMAIL_CATEGORIES.map(c => ({
    user_id: user.id,
    category: c.key,
    enabled: false,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('email_preferences')
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return {}
}
```

- [ ] **Step 2: Create the `EmailPreferences` client component**

Create `web/src/components/settings/EmailPreferences.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { saveEmailPreferences, unsubscribeFromAll, EMAIL_CATEGORIES } from '@/app/(app)/settings/email-actions'

interface EmailPreferencesProps {
  initialPrefs: Record<string, boolean>
}

const GROUPS = ['Notifications', 'Club & Content', 'Platform'] as const

export function EmailPreferences({ initialPrefs }: EmailPreferencesProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initialPrefs)
  const [saving, startSave] = useTransition()
  const [unsubbing, startUnsub] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle(key: string, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaved(false)
    startSave(async () => {
      await saveEmailPreferences(next)
      setSaved(true)
    })
  }

  function handleUnsubAll() {
    startUnsub(async () => {
      const allOff = Object.fromEntries(EMAIL_CATEGORIES.map(c => [c.key, false]))
      setPrefs(allOff)
      await unsubscribeFromAll()
    })
  }

  return (
    <section id="email-preferences" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Email Preferences</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose which emails you receive from 18th Man.</p>
        </div>
        {saved && !saving && (
          <span className="text-xs text-emerald-500">Saved</span>
        )}
      </div>

      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {GROUPS.map(group => {
          const items = EMAIL_CATEGORIES.filter(c => c.group === group)
          return (
            <div key={group} className="p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{group}</p>
              {items.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <Switch
                    checked={prefs[key] !== false}
                    onCheckedChange={v => toggle(key, v)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300" disabled={unsubbing}>
            Unsubscribe from all emails
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from all emails?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop receiving all emails from 18th Man. You can re-enable them at any time from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubAll}>
              Unsubscribe from all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
```

- [ ] **Step 3: Add `EmailPreferences` to the settings page**

In `web/src/app/(app)/settings/page.tsx`, add this import at the top:
```typescript
import { EmailPreferences } from '@/components/settings/EmailPreferences'
```

Then fetch preferences in the `SettingsPage` function, after the existing user/profile fetch:
```typescript
// Fetch user's email preferences (missing row = enabled)
const { data: emailPrefRows } = await supabase
  .from('email_preferences')
  .select('category, enabled')
  .eq('user_id', user.id)

const emailPrefs: Record<string, boolean> = {}
for (const row of emailPrefRows ?? []) {
  emailPrefs[row.category] = row.enabled
}
```

Then add `<EmailPreferences initialPrefs={emailPrefs} />` inside the page's return JSX, after the subscription section and before the quick links section. Find the existing section divider and add:
```tsx
<div className="border-t border-zinc-800 pt-8">
  <EmailPreferences initialPrefs={emailPrefs} />
</div>
```

- [ ] **Step 4: Verify the settings page loads and toggles work**

Start dev server and navigate to `/settings`. Scroll down to "Email Preferences". Toggle a switch — it should show "Saved" confirmation.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/(app)/settings/email-actions.ts web/src/components/settings/EmailPreferences.tsx web/src/app/(app)/settings/page.tsx
git commit -m "feat: email preferences UI in settings with per-category opt-out"
```

---

## Task 6: Campaign Library

**Files:**
- Create: `web/src/lib/email-campaigns.ts`

- [ ] **Step 1: Create campaign library**

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { generateUnsubscribeToken } from '@/lib/email-notifications'
import { sendCampaignEmailHtml } from '@/lib/email'

export type TriggerType = 'new_public_drill' | 'weekly_focus' | 'podcast' | 'wellbeing' | 'announcement' | 'poll'
export type CampaignSegment = 'all' | 'coaches' | 'club_admins' | 'free' | 'pro'

const BATCH_TRIGGER_TYPES: TriggerType[] = ['new_public_drill', 'podcast', 'wellbeing']

export async function getBatchThreshold(triggerType: TriggerType): Promise<number> {
  const service = createServiceClient()
  const { data } = await service.from('email_settings').select('*').single()
  switch (triggerType) {
    case 'new_public_drill': return data?.batch_threshold_drill ?? 5
    case 'podcast': return data?.batch_threshold_podcast ?? 3
    case 'wellbeing': return data?.batch_threshold_wellbeing ?? 3
    default: return 1
  }
}

// ── Auto-draft creation ────────────────────────────────────────────────────────

export async function createCampaignAutoDraft(
  triggerType: TriggerType,
  item: { id: string; title: string; url: string; itemType: 'drill' | 'podcast' | 'wellbeing' | 'weekly_focus' },
): Promise<void> {
  const service = createServiceClient()

  if (!BATCH_TRIGGER_TYPES.includes(triggerType)) {
    // Non-batched types (weekly_focus, announcement) — create standalone campaign immediately
    const { subject, bodyHtml } = generateAutoDraftContent(triggerType, [item])
    await service.from('email_campaigns').insert({
      type: 'auto_draft',
      trigger_type: triggerType,
      subject,
      body_html: bodyHtml,
      status: 'ready',
      segment: 'all',
    })
    return
  }

  // Check for open batch campaign of this trigger type
  const { data: existing } = await service
    .from('email_campaigns')
    .select('id')
    .eq('trigger_type', triggerType)
    .eq('type', 'auto_draft')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let campaignId: string

  if (existing) {
    campaignId = existing.id
  } else {
    // Create new batch campaign
    const { data: newCampaign, error } = await service
      .from('email_campaigns')
      .insert({
        type: 'auto_draft',
        trigger_type: triggerType,
        subject: '',
        body_html: '',
        status: 'draft',
        segment: 'all',
      })
      .select('id')
      .single()

    if (error || !newCampaign) {
      console.error('[createCampaignAutoDraft] insert error:', error)
      return
    }
    campaignId = newCampaign.id
  }

  // Add item to batch
  await service.from('email_campaign_items').insert({
    campaign_id: campaignId,
    item_type: item.itemType,
    item_id: item.id,
    item_title: item.title,
    item_url: item.url,
  })

  // Count items in batch
  const { count } = await service
    .from('email_campaign_items')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  const threshold = await getBatchThreshold(triggerType)
  const itemCount = count ?? 0

  if (itemCount >= threshold) {
    // Fetch all items to generate content
    const { data: items } = await service
      .from('email_campaign_items')
      .select('item_title, item_url, item_type')
      .eq('campaign_id', campaignId)

    const { subject, bodyHtml } = generateAutoDraftContent(triggerType, items ?? [])
    await service
      .from('email_campaigns')
      .update({ status: 'ready', subject, body_html: bodyHtml })
      .eq('id', campaignId)
  } else {
    // Still accumulating — regenerate preview content
    const { data: items } = await service
      .from('email_campaign_items')
      .select('item_title, item_url, item_type')
      .eq('campaign_id', campaignId)
    const { subject, bodyHtml } = generateAutoDraftContent(triggerType, items ?? [])
    await service
      .from('email_campaigns')
      .update({ subject, body_html: bodyHtml })
      .eq('id', campaignId)
  }
}

// ── Auto-draft content generation ─────────────────────────────────────────────

function generateAutoDraftContent(
  triggerType: TriggerType,
  items: { item_title?: string; title?: string; item_url?: string; url?: string; item_type?: string }[],
): { subject: string; bodyHtml: string } {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

  switch (triggerType) {
    case 'new_public_drill': {
      const count = items.length
      const subject = count === 1
        ? `New drill: ${items[0].item_title ?? items[0].title}`
        : `${count} new drills added to 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${i.item_url ?? i.url ?? SITE_URL}" style="color:#e8560a;font-weight:600;font-size:14px;">${i.item_title ?? i.title}</a>
        </td></tr>`
      ).join('')
      const bodyHtml = `
        <p style="margin:0 0 16px;color:#a1a1aa;">New drill${count !== 1 ? 's have' : ' has'} been added to the 18th Man drill library.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">
          ${listItems}
        </table>`
      return { subject, bodyHtml }
    }

    case 'weekly_focus': {
      const title = items[0]?.item_title ?? items[0]?.title ?? 'this week\'s focus'
      return {
        subject: `This week's coaching focus: ${title}`,
        bodyHtml: `<p style="margin:0 0 16px;color:#a1a1aa;">Your weekly coaching focus has been published: <strong style="color:#ffffff;">${title}</strong>. Head to the app to see the suggested drills and discussion.</p>`,
      }
    }

    case 'podcast': {
      const count = items.length
      const subject = count === 1
        ? `New podcast: ${items[0].item_title ?? items[0].title}`
        : `${count} new podcast episodes on 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${i.item_url ?? i.url ?? SITE_URL}" style="color:#e8560a;font-weight:600;font-size:14px;">${i.item_title ?? i.title}</a>
        </td></tr>`
      ).join('')
      return {
        subject,
        bodyHtml: `
          <p style="margin:0 0 16px;color:#a1a1aa;">New coaching podcast content is available.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">
            ${listItems}
          </table>`,
      }
    }

    case 'wellbeing': {
      const count = items.length
      const subject = count === 1
        ? `New resource: ${items[0].item_title ?? items[0].title}`
        : `${count} new wellbeing resources on 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${i.item_url ?? i.url ?? SITE_URL}" style="color:#e8560a;font-weight:600;font-size:14px;">${i.item_title ?? i.title}</a>
        </td></tr>`
      ).join('')
      return {
        subject,
        bodyHtml: `
          <p style="margin:0 0 16px;color:#a1a1aa;">New wellbeing and coaching resources are available.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">
            ${listItems}
          </table>`,
      }
    }

    default:
      return { subject: 'Update from 18th Man', bodyHtml: '<p>Something new is waiting for you on 18th Man.</p>' }
  }
}

// ── Send a campaign to its segment ────────────────────────────────────────────

export async function sendCampaign(campaignId: string): Promise<{ sent: number; errors: number }> {
  const service = createServiceClient()
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

  const { data: campaign } = await service
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) return { sent: 0, errors: 0 }

  // Get recipient profiles based on segment
  let profileQuery = service.from('profiles').select('id')
  if (campaign.segment === 'coaches') profileQuery = profileQuery.eq('role', 'coach')
  else if (campaign.segment === 'free') profileQuery = profileQuery.is('subscription_tier', null)
  else if (campaign.segment === 'pro') profileQuery = profileQuery.in('subscription_tier', ['coach', 'club'])
  else if (campaign.segment === 'club_admins') {
    // Get users who are admin of any club — requires join via club_members or similar
    // For now, use admin role as approximation; update if club_members table has admin flag
    profileQuery = profileQuery.eq('role', 'admin')
  }

  const { data: profiles } = await profileQuery
  if (!profiles?.length) return { sent: 0, errors: 0 }

  const category = campaign.trigger_type === 'announcement' || campaign.trigger_type === 'poll'
    ? 'announcement'
    : campaign.trigger_type

  let sent = 0
  let errors = 0

  for (const profile of profiles) {
    // Check opt-out
    const { data: pref } = await service
      .from('email_preferences')
      .select('enabled')
      .eq('user_id', profile.id)
      .eq('category', category)
      .single()
    if (pref?.enabled === false) continue

    const { data: authUser } = await service.auth.admin.getUserById(profile.id)
    const email = authUser?.user?.email
    if (!email) continue

    const unsubToken = generateUnsubscribeToken(profile.id, category)
    const result = await sendCampaignEmailHtml(email, {
      subject: campaign.subject,
      bodyHtml: campaign.body_html,
      ctaLabel: campaign.cta_label ?? undefined,
      ctaUrl: campaign.cta_url ?? undefined,
      userId: profile.id,
      category,
      unsubToken,
    })

    if (result.success) {
      await service.from('email_sends').insert({
        user_id: profile.id,
        campaign_id: campaignId,
        category,
        resend_message_id: result.messageId ?? null,
      })
      sent++
    } else {
      errors++
    }
  }

  await service
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', campaignId)

  return { sent, errors }
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/email-campaigns.ts
git commit -m "feat: campaign library with auto-draft, batch logic, and segment send"
```

---

## Task 7: Auto-Draft Hooks

**Files:**
- Modify: `web/src/app/(app)/admin/drills/actions.ts`
- Modify: relevant weekly focus, podcast, wellbeing action files

- [ ] **Step 1: Find the drill approval action**

```bash
cat "web/src/app/(app)/admin/drills/actions.ts"
```

In the `approveDrill` function (after the Supabase update that sets `approval_status = 'approved'`), add:

```typescript
import { createCampaignAutoDraft } from '@/lib/email-campaigns'

// After the existing drill approval update:
const { data: drill } = await supabase
  .from('drills')
  .select('id, title')
  .eq('id', drillId)
  .single()

if (drill) {
  createCampaignAutoDraft('new_public_drill', {
    id: drill.id,
    title: drill.title ?? 'New Drill',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/drills/${drill.id}`,
    itemType: 'drill',
  }).catch(err => console.error('[auto-draft drill]', err))
}
```

- [ ] **Step 2: Find weekly focus creation action**

```bash
grep -r "weekly_focus\|weekly-focus" web/src/app --include="*.ts" -l
```

Open the relevant Server Action file. After the insert/upsert that creates/publishes a weekly focus, add:

```typescript
import { createCampaignAutoDraft } from '@/lib/email-campaigns'

// After weekly focus creation:
if (weeklyFocus) {
  createCampaignAutoDraft('weekly_focus', {
    id: weeklyFocus.id,
    title: weeklyFocus.topic ?? 'Weekly Focus',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/weekly-focus`,
    itemType: 'weekly_focus',
  }).catch(err => console.error('[auto-draft weekly-focus]', err))
}
```

- [ ] **Step 3: Find podcast creation action**

```bash
grep -r "podcast" web/src/app --include="*.ts" -l
```

Open the relevant Server Action file. After the podcast insert, add:

```typescript
import { createCampaignAutoDraft } from '@/lib/email-campaigns'

// After podcast insert:
if (podcast) {
  createCampaignAutoDraft('podcast', {
    id: podcast.id,
    title: podcast.title ?? 'New Episode',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/podcasts/${podcast.id}`,
    itemType: 'podcast',
  }).catch(err => console.error('[auto-draft podcast]', err))
}
```

- [ ] **Step 4: Find wellbeing resource creation action**

```bash
grep -r "wellbeing" web/src/app --include="*.ts" -l
```

Open the relevant Server Action file. After the wellbeing resource insert, add:

```typescript
import { createCampaignAutoDraft } from '@/lib/email-campaigns'

// After wellbeing insert:
if (resource) {
  createCampaignAutoDraft('wellbeing', {
    id: resource.id,
    title: resource.title ?? 'New Resource',
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/wellbeing/${resource.id}`,
    itemType: 'wellbeing',
  }).catch(err => console.error('[auto-draft wellbeing]', err))
}
```

- [ ] **Step 5: Verify types compile**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add -p  # stage only the changed action files
git commit -m "feat: auto-draft campaign emails on drill approval, weekly focus, podcast, wellbeing"
```

---

## Task 8: Admin Email Queue Page

**Files:**
- Create: `web/src/app/(app)/admin/email/page.tsx`

- [ ] **Step 1: Create the queue page**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Plus, Clock, Send, FileText, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Email Campaigns — Admin' }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-800 text-zinc-400' },
  ready: { label: 'Ready to send', className: 'bg-amber-500/20 text-amber-400' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/20 text-blue-400' },
  sent: { label: 'Sent', className: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-800 text-zinc-600' },
}

const TRIGGER_LABELS: Record<string, string> = {
  new_public_drill: 'New Drill',
  weekly_focus: 'Weekly Focus',
  podcast: 'Podcast',
  wellbeing: 'Wellbeing',
  announcement: 'Announcement',
  poll: 'Poll',
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'queue' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('id, type, trigger_type, subject, segment, status, scheduled_at, sent_at, created_at, test_sent_at')
    .order('created_at', { ascending: false })

  const queue = (campaigns ?? []).filter(c => ['draft', 'ready'].includes(c.status))
  const scheduled = (campaigns ?? []).filter(c => c.status === 'scheduled')
  const sent = (campaigns ?? []).filter(c => c.status === 'sent')

  const tabs = [
    { key: 'queue', label: 'Queue', count: queue.length, items: queue },
    { key: 'scheduled', label: 'Scheduled', count: scheduled.length, items: scheduled },
    { key: 'sent', label: 'Sent', count: sent.length, items: sent },
  ]
  const activeTab = tabs.find(t => t.key === tab) ?? tabs[0]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="app-heading text-2xl">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and approve outgoing emails</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/email/settings" className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors">
            Settings
          </Link>
          <Link href="/admin/email/compose" className="flex items-center gap-1.5 text-xs font-medium bg-[#e8560a] hover:bg-[#d04e09] text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Compose
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin/email?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#e8560a] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Campaign list */}
      {activeTab.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Send size={36} className="text-zinc-700 mb-4" />
          <p className="font-medium text-zinc-400">Nothing here</p>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'queue' ? 'Auto-drafts will appear here when content is published' : `No ${tab} campaigns`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab.items.map(campaign => {
            const badge = STATUS_BADGE[campaign.status]
            const triggerLabel = campaign.type === 'admin_composed'
              ? 'Admin composed'
              : `Auto — ${TRIGGER_LABELS[campaign.trigger_type] ?? campaign.trigger_type}`
            return (
              <Link
                key={campaign.id}
                href={`/admin/email/${campaign.id}`}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-zinc-600">{triggerLabel}</span>
                    {campaign.status === 'ready' && !campaign.test_sent_at && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <AlertCircle size={11} /> Test send required
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {campaign.subject || <span className="text-zinc-600 italic">No subject yet</span>}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Segment: {campaign.segment}
                    {campaign.scheduled_at && ` · Scheduled: ${new Date(campaign.scheduled_at).toLocaleString('en-GB')}`}
                    {campaign.sent_at && ` · Sent: ${new Date(campaign.sent_at).toLocaleString('en-GB')}`}
                  </p>
                </div>
                <FileText size={16} className="text-zinc-600 flex-shrink-0 mt-1" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the page loads**

Navigate to `/admin/email` — expect the queue page with tabs.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/admin/email/page.tsx
git commit -m "feat: admin email campaign queue page"
```

---

## Task 9: Admin Campaign Server Actions

**Files:**
- Create: `web/src/app/(app)/admin/email/actions.ts`

- [ ] **Step 1: Create Server Actions**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCampaign } from '@/lib/email-campaigns'
import { sendCampaignEmailHtml } from '@/lib/email'
import { generateUnsubscribeToken } from '@/lib/email-notifications'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, user }
}

export async function updateCampaign(campaignId: string, data: {
  subject?: string
  body_html?: string
  cta_label?: string | null
  cta_url?: string | null
  segment?: string
  scheduled_at?: string | null
}): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ ...data })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}

export async function sendTestEmail(campaignId: string, toEmail: string): Promise<{ error?: string }> {
  const { supabase, user } = await assertAdmin()
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('subject, body_html, cta_label, cta_url, trigger_type')
    .eq('id', campaignId)
    .single()
  if (!campaign) return { error: 'Campaign not found' }

  const category = campaign.trigger_type === 'announcement' || campaign.trigger_type === 'poll'
    ? 'announcement'
    : campaign.trigger_type
  const unsubToken = generateUnsubscribeToken(user.id, category)

  const result = await sendCampaignEmailHtml(toEmail, {
    subject: `[TEST] ${campaign.subject}`,
    bodyHtml: campaign.body_html,
    ctaLabel: campaign.cta_label ?? undefined,
    ctaUrl: campaign.cta_url ?? undefined,
    userId: user.id,
    category,
    unsubToken,
  })

  if (!result.success) return { error: result.error }

  await supabase
    .from('email_campaigns')
    .update({ test_sent_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}

export async function approveCampaignNow(campaignId: string): Promise<{ error?: string }> {
  await assertAdmin()
  const { sent, errors } = await sendCampaign(campaignId)
  console.log(`[approveCampaignNow] sent: ${sent}, errors: ${errors}`)
  revalidatePath('/admin/email')
  redirect('/admin/email?tab=sent')
}

export async function scheduleCampaign(campaignId: string, scheduledAt: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ status: 'scheduled', scheduled_at: scheduledAt })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/admin/email')
  redirect('/admin/email?tab=scheduled')
}

export async function cancelCampaign(campaignId: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/admin/email')
  return {}
}

export async function createAdminComposedCampaign(data: {
  subject: string
  body_html: string
  cta_label?: string
  cta_url?: string
  segment: string
}): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await assertAdmin()
  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .insert({
      type: 'admin_composed',
      trigger_type: 'announcement',
      subject: data.subject,
      body_html: data.body_html,
      cta_label: data.cta_label ?? null,
      cta_url: data.cta_url ?? null,
      segment: data.segment,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: campaign.id }
}

export async function saveEmailSystemSettings(data: {
  burst_threshold: number
  burst_window_minutes: number
  batch_threshold_drill: number
  batch_threshold_podcast: number
  batch_threshold_wellbeing: number
}): Promise<{ error?: string }> {
  const service = createServiceClient()
  const { error } = await service
    .from('email_settings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .not('id', 'is', null)
  if (error) return { error: error.message }
  revalidatePath('/admin/email/settings')
  return {}
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/(app)/admin/email/actions.ts
git commit -m "feat: admin email campaign server actions"
```

---

## Task 10: Admin Compose Page

**Files:**
- Create: `web/src/app/(app)/admin/email/compose/page.tsx`

- [ ] **Step 1: Create the compose page**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminComposedCampaign } from '../actions'

const SEGMENTS = [
  { value: 'all', label: 'All users' },
  { value: 'coaches', label: 'Coaches only' },
  { value: 'club_admins', label: 'Club admins only' },
  { value: 'free', label: 'Free tier users' },
  { value: 'pro', label: 'Pro subscribers' },
]

const TRIGGER_TYPES = [
  { value: 'announcement', label: 'Feature announcement' },
  { value: 'poll', label: 'Feature poll / survey' },
]

export default function AdminEmailComposePage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [segment, setSegment] = useState('all')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!subject.trim()) { setError('Subject is required'); return }
    if (!body.trim()) { setError('Body is required'); return }
    setError('')
    startTransition(async () => {
      const result = await createAdminComposedCampaign({
        subject,
        body_html: body,
        cta_label: ctaLabel || undefined,
        cta_url: ctaUrl || undefined,
        segment,
      })
      if (result.error) { setError(result.error); return }
      router.push(`/admin/email/${result.id}`)
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Compose Campaign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Write a new email campaign for your coaches</p>
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. New feature: Session PDF export is here"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Body <span className="text-zinc-600 normal-case font-normal">(HTML allowed)</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            placeholder="Write your email body here. You can use <strong>, <a>, <br>, <ul>, <li> tags."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA button label <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              value={ctaLabel}
              onChange={e => setCtaLabel(e.target.value)}
              placeholder="e.g. Try it now"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA URL <span className="text-zinc-600 normal-case font-normal">(optional)</span></label>
            <input
              type="url"
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://18thman.app/..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Audience segment</label>
          <select
            value={segment}
            onChange={e => setSegment(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          >
            {SEGMENTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Creating...' : 'Create draft →'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/(app)/admin/email/compose/page.tsx
git commit -m "feat: admin campaign compose page"
```

---

## Task 11: Admin Campaign Review / Approve Page

**Files:**
- Create: `web/src/app/(app)/admin/email/[id]/page.tsx`

- [ ] **Step 1: Create the review page**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { CampaignApproveForm } from './CampaignApproveForm'

export default async function AdminEmailCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (!campaign) redirect('/admin/email')

  const { data: items } = await supabase
    .from('email_campaign_items')
    .select('item_title, item_url, item_type')
    .eq('campaign_id', id)

  // Smart schedule suggestion: next Tuesday 9am UTC
  const now = new Date()
  const daysUntilTuesday = (2 - now.getUTCDay() + 7) % 7 || 7
  const suggested = new Date(now)
  suggested.setUTCDate(now.getUTCDate() + daysUntilTuesday)
  suggested.setUTCHours(9, 0, 0, 0)
  const suggestedIso = suggested.toISOString().slice(0, 16) // datetime-local format

  // Admin email for test send
  const { data: authUser } = await (await import('@/lib/supabase/service')).createServiceClient().auth.admin.getUserById(user.id)
  const adminEmail = authUser?.user?.email ?? ''

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Review Campaign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaign.type === 'auto_draft' ? `Auto-generated · ${campaign.trigger_type.replace(/_/g, ' ')}` : 'Admin composed'}
          </p>
        </div>
      </div>

      {/* Status banner */}
      {campaign.status === 'ready' && !campaign.test_sent_at && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle size={16} />
          You must send a test email before you can approve this campaign.
        </div>
      )}
      {campaign.test_sent_at && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle size={16} />
          Test sent at {new Date(campaign.test_sent_at).toLocaleString('en-GB')} — approve button is unlocked.
        </div>
      )}

      {/* Batched items list if auto-draft */}
      {items && items.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Batched items ({items.length})</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-zinc-600 capitalize">{item.item_type}</span>
              <a href={item.item_url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-[#e8560a] transition-colors">
                {item.item_title}
              </a>
            </div>
          ))}
        </div>
      )}

      <CampaignApproveForm
        campaign={campaign}
        adminEmail={adminEmail}
        suggestedSchedule={suggestedIso}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `CampaignApproveForm` client component**

Create `web/src/app/(app)/admin/email/[id]/CampaignApproveForm.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Send, Clock, TestTube } from 'lucide-react'
import { updateCampaign, sendTestEmail, approveCampaignNow, scheduleCampaign, cancelCampaign } from '../actions'

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
  const [isSaving, startSave] = useTransition()
  const [isTesting, startTest] = useTransition()
  const [isApproving, startApprove] = useTransition()
  const [isScheduling, startSchedule] = useTransition()

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
    startApprove(async () => {
      await approveCampaignNow(campaign.id)
    })
  }

  function handleSchedule() {
    if (!testSent) return
    startSchedule(async () => {
      await scheduleCampaign(campaign.id, new Date(scheduledAt).toISOString())
    })
  }

  return (
    <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          onBlur={save}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body HTML</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onBlur={save}
          rows={12}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
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

      {/* Action row */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        {/* Test send */}
        <button
          onClick={handleTest}
          disabled={isTesting}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors disabled:opacity-50"
        >
          <TestTube size={14} />
          {isTesting ? 'Sending test...' : testSent ? 'Resend test' : 'Send test to me'}
        </button>

        {/* Schedule */}
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

        {/* Send now */}
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
  )
}
```

- [ ] **Step 3: Verify the review page loads for an existing campaign**

Navigate to `/admin/email` and click a campaign. Expect the review/edit/approve form.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/(app)/admin/email/[id]/
git commit -m "feat: admin campaign review and approve page"
```

---

## Task 12: Admin Email Settings Page

**Files:**
- Create: `web/src/app/(app)/admin/email/settings/page.tsx`

- [ ] **Step 1: Create the settings page**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ArrowLeft } from 'lucide-react'
import { EmailSettingsForm } from './EmailSettingsForm'

export default async function AdminEmailSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const service = createServiceClient()
  const { data: settings } = await service.from('email_settings').select('*').single()

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Email Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure thresholds for notifications and batching</p>
        </div>
      </div>
      <EmailSettingsForm settings={settings} />
    </div>
  )
}
```

Create `web/src/app/(app)/admin/email/settings/EmailSettingsForm.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { saveEmailSystemSettings } from '../actions'

interface EmailSettings {
  burst_threshold: number
  burst_window_minutes: number
  batch_threshold_drill: number
  batch_threshold_podcast: number
  batch_threshold_wellbeing: number
}

export function EmailSettingsForm({ settings }: { settings: EmailSettings | null }) {
  const defaults = settings ?? {
    burst_threshold: 3,
    burst_window_minutes: 5,
    batch_threshold_drill: 5,
    batch_threshold_podcast: 3,
    batch_threshold_wellbeing: 3,
  }

  const [values, setValues] = useState(defaults)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  function set(key: keyof EmailSettings, val: string) {
    setValues(v => ({ ...v, [key]: parseInt(val) || 1 }))
    setSaved(false)
  }

  function handleSave() {
    start(async () => {
      const result = await saveEmailSystemSettings(values)
      if (result.error) { setError(result.error); return }
      setSaved(true)
    })
  }

  const field = (label: string, key: keyof EmailSettings, hint: string) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <p className="text-xs text-zinc-600">{hint}</p>
      <input
        type="number"
        min={1}
        value={values[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
      />
    </div>
  )

  return (
    <div className="space-y-5 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notification email rate limiting</p>
      {field('Burst threshold', 'burst_threshold', 'Number of notifications before collapsing to a burst summary email')}
      {field('Burst window (minutes)', 'burst_window_minutes', 'Time window to count notifications in')}

      <div className="border-t border-zinc-800 pt-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Campaign batch thresholds</p>
        {field('Drills batch size', 'batch_threshold_drill', 'Number of approved public drills before a campaign draft is marked ready')}
        {field('Podcast batch size', 'batch_threshold_podcast', 'Podcast episodes per campaign draft')}
        {field('Wellbeing batch size', 'batch_threshold_wellbeing', 'Wellbeing resources per campaign draft')}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        {saved && <span className="text-xs text-emerald-500">Settings saved</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto bg-[#e8560a] hover:bg-[#d04e09] disabled:opacity-50 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/(app)/admin/email/settings/
git commit -m "feat: admin email settings page with configurable thresholds"
```

---

## Task 13: Cron Job for Scheduled Campaigns

**Files:**
- Create: `web/src/app/api/cron/send-campaigns/route.ts`
- Modify: `web/vercel.json`

- [ ] **Step 1: Create the cron handler**

```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCampaign } from '@/lib/email-campaigns'

// Called by Vercel Cron every minute (see vercel.json)
// Protected by CRON_SECRET — Vercel sets Authorization header automatically
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data: due } = await service
    .from('email_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (!due?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let totalSent = 0
  let totalErrors = 0

  for (const campaign of due) {
    const { sent, errors } = await sendCampaign(campaign.id)
    totalSent += sent
    totalErrors += errors
  }

  console.log(`[cron/send-campaigns] campaigns: ${due.length}, sent: ${totalSent}, errors: ${totalErrors}`)

  return NextResponse.json({ ok: true, campaigns: due.length, sent: totalSent, errors: totalErrors })
}
```

- [ ] **Step 2: Update `web/vercel.json` to add the cron**

Replace the contents of `web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/trial-expiry",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/send-campaigns",
      "schedule": "* * * * *"
    }
  ]
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/cron/send-campaigns/route.ts web/vercel.json
git commit -m "feat: Vercel cron job for scheduled campaign delivery"
```

---

## Verification Checklist

### Notification emails
- [ ] Trigger a drill rating on another user's drill → their email receives a notification email
- [ ] Trigger 4 rapid notifications for the same user → confirm burst email fires instead of 4 individual emails
- [ ] Set drill_rating to false in Settings → trigger a rating → confirm no email arrives
- [ ] Copy unsubscribe link from an email footer → visit URL without being logged in → confirm `email_preferences` row is inserted with `enabled = false` and page shows success
- [ ] Visit `/api/unsubscribe` without a token → confirm "Invalid link" HTML page

### Campaign queue
- [ ] Approve a public drill → visit `/admin/email` → confirm auto-draft appears in queue
- [ ] Approve 5 public drills → confirm 5th drill tips the draft to "ready" status
- [ ] Create an admin-composed campaign via `/admin/email/compose` → confirm it appears in queue as "Draft"
- [ ] On a campaign review page, click "Approve & send now" without sending a test → confirm button is disabled
- [ ] Send test → confirm button unlocks, test email arrives with `[TEST]` prefix in subject
- [ ] Click "Approve & send now" → confirm status changes to "sent" in `/admin/email?tab=sent`
- [ ] Set a schedule time → click "Schedule" → confirm campaign appears in `/admin/email?tab=scheduled` → wait for cron to fire → confirm sent

### User preferences
- [ ] On `/settings`, scroll to "Email Preferences" → toggle off "Direct messages" → refresh → toggle remains off
- [ ] Click "Unsubscribe from all emails" → confirm dialog → all toggles turn off
- [ ] Re-enable one category → confirm it saves and persists

### Compliance
- [ ] Every received email has both unsubscribe links in footer
- [ ] Campaign emails sent to "Coaches only" segment do not reach viewer-role accounts
