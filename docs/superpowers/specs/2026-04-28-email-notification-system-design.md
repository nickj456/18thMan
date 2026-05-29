# Email & Notification System Design
**Date:** 2026-04-28
**Status:** Approved

---

## Context

18th Man already has Resend configured for transactional emails (welcome, trial, match reports) and an in-app notification system. This spec adds:

1. **Notification emails** — email delivery of in-app notifications with rate limiting
2. **Campaign email system** — admin-controlled marketing/announcement emails with auto-draft from app events
3. **User email preferences** — granular opt-out per category with compliant unsubscribe

---

## Architecture

Three systems sharing the existing Resend + Supabase foundation. All email rendering uses the existing branded dark-theme template in `lib/email.ts`.

```
┌─────────────────────────────────────────────────────┐
│  1. NOTIFICATION EMAILS                             │
│  Event fires → rate check → send or collapse       │
├─────────────────────────────────────────────────────┤
│  2. CAMPAIGN EMAILS                                 │
│  Trigger fires → auto-draft OR admin composes      │
│  → admin approval queue → schedule/send            │
├─────────────────────────────────────────────────────┤
│  3. USER PREFERENCES                                │
│  Granular opt-out per category, respected by both  │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### `email_preferences`
```sql
id              uuid primary key
user_id         uuid references profiles(id) on delete cascade
category        text  -- see categories below
enabled         boolean default true
updated_at      timestamptz default now()
unique(user_id, category)
```
Preferences are stored lazily — missing row = opted in. Only opt-outs are stored.

### `email_campaigns`
```sql
id              uuid primary key
type            text  -- 'auto_draft' | 'admin_composed'
trigger_type    text  -- 'new_public_drill' | 'weekly_focus' | 'podcast' | 'wellbeing' | 'announcement' | 'poll'
subject         text
body_html       text
cta_label       text nullable
cta_url         text nullable
segment         text  -- 'all' | 'coaches' | 'club_admins' | 'free' | 'pro'
status          text  -- 'draft' | 'ready' | 'scheduled' | 'sent' | 'cancelled'
scheduled_at    timestamptz nullable
sent_at         timestamptz nullable
created_by      uuid references profiles(id) nullable  -- null = auto-generated
test_sent_at    timestamptz nullable  -- approve button locked until set
resend_batch_id text nullable
created_at      timestamptz default now()
```

### `email_campaign_items`
```sql
id              uuid primary key
campaign_id     uuid references email_campaigns(id) on delete cascade
item_type       text  -- 'drill' | 'podcast' | 'wellbeing'
item_id         uuid
item_title      text
item_url        text
created_at      timestamptz default now()
```

### `email_sends`
```sql
id              uuid primary key
user_id         uuid references profiles(id)
campaign_id     uuid references email_campaigns(id) nullable
notification_id uuid references notifications(id) nullable
category        text
sent_at         timestamptz default now()
resend_message_id text
```
Used for deduplication and audit trail.

### `notification_email_log`
```sql
id              uuid primary key
user_id         uuid references profiles(id)
sent_at         timestamptz default now()
notification_ids uuid[]
is_burst        boolean default false
```
Used to enforce per-user rate limiting window.

---

## Email Categories

| Category key | Label | Default |
|---|---|---|
| `dm` | Direct messages | On |
| `drill_rating` | Drill ratings & comments | On |
| `club_invite` | Club & group invites | On |
| `new_follower` | New followers | On |
| `session_scheduled` | Sessions scheduled | On |
| `weekly_focus` | Weekly focus published | On |
| `new_public_drill` | New public drills | On |
| `podcast` | New podcast episodes | On |
| `wellbeing` | New wellbeing resources | On |
| `announcement` | Feature announcements & polls | On |

---

## System 1: Notification Emails

### Flow
```
Notification created in DB
        ↓
Check email_preferences for user + category
  → opted out? Stop.
        ↓
Check notification_email_log — emails sent in last 5 minutes
  → under threshold (default 3)? Send individual email.
  → at/over threshold? Send burst summary email.
        ↓
Log to email_sends
```

### Individual email examples
- *"Nick rated your drill 'Short Kick Restart' ⭐⭐⭐⭐⭐"*
- *"You have a new message from Sarah"*
- *"You've been invited to join Wigan Warriors"*

### Burst email
- **Subject:** "You have 4 new notifications in 18th Man"
- **Body:** Brief list of notification types, single CTA → open app
- Fires once the threshold is hit; suppresses further individual emails for the remainder of the window

### Unsubscribe footer (every email)
Two links:
1. **"Unsubscribe from [category] emails"** — one-click, signed token, no login required
2. **"Manage all email preferences"** → `/settings#email-preferences`

Signed token format: `HMAC(user_id + category + timestamp)` — verified server-side at `/api/unsubscribe?token=...`

### Rate limit config
Burst threshold (default 3 in 5 minutes) is configurable in admin email settings.

---

## System 2: Campaign Email System

### Admin queue — `/admin/email`
Three tabs: **Queue (Drafts)** | **Scheduled** | **Sent**

**Queue tab shows:**
- Auto-generated drafts (badge: "Auto — New Drill")
- Admin-composed drafts
- Batch status: *"3/5 drills queued — waiting for 2 more or manual trigger"*

### Auto-draft flow
```
Trigger fires (drill published, podcast added, etc.)
        ↓
Is there an open batch campaign of this type?
  → Yes: add item to email_campaign_items
    → item count hit threshold? Set status = 'ready'
  → No: create new email_campaigns row (status = 'draft')
        and add first item
        ↓
System generates subject + body from item metadata
        ↓
Admin reviews in queue → edits if needed
→ Preview rendered email
→ Test send to self (required — unlocks approve button)
→ Approve → Send now OR schedule
```

### Auto-draft triggers

| Trigger | Category | Default batch threshold |
|---|---|---|
| Public drill published | `new_public_drill` | 5 |
| Weekly focus published | `weekly_focus` | 1 (sends immediately as single) |
| Podcast episode added | `podcast` | 3 |
| Wellbeing resource added | `wellbeing` | 3 |

### Admin compose flow
Starts blank. Editor fields:
- Subject line
- Body (rich text: bold, links, lists)
- Optional CTA button (label + URL)
- Segment picker: All users / Coaches only / Club admins / Free tier / Pro tier
- Wrapped in existing branded template automatically

Same approval steps as auto-draft (test send required before approve unlocks).

### Scheduling
On approval, admin sees:
- **Send now** button
- **Schedule for...** date/time picker with smart default (e.g. next Tuesday 9am if published off-hours)

Vercel cron job runs every minute, checks `email_campaigns` for `status = 'scheduled'` and `scheduled_at <= now()`, executes send.

### Batch threshold config
Admin can configure per type in `/admin/email/settings`:
- Drills: default 5
- Podcasts: default 3
- Wellbeing: default 3

### Segmentation
At send time, query `profiles` filtered by:
- `all` — all profiles
- `coaches` — `role = 'coach'`
- `club_admins` — users who are admin of any club
- `free` — no active subscription
- `pro` — active Coach Pro or Club subscription

Cross-reference with `email_preferences` to exclude opted-out users before sending.

---

## System 3: User Email Preferences

### Location
New section on `/settings` page: **"Email Preferences"** — below subscription section.

### UI
Grouped toggles:

```
Email Preferences
─────────────────────────────────────
Notifications
  ☑ Direct messages
  ☑ Drill ratings & comments
  ☑ Club & group invites
  ☑ New followers
  ☑ Sessions scheduled

Club & Content
  ☑ Weekly focus published
  ☑ New public drills
  ☑ New podcast episodes
  ☑ New wellbeing resources

Platform
  ☑ Feature announcements & polls
─────────────────────────────────────
  [Unsubscribe from all emails]
```

**"Unsubscribe from all"** — confirmation dialog, flips all categories off. Reversible.

Preferences saved via Server Action. Optimistic UI update.

---

## Critical Files

| File | Change |
|---|---|
| `web/src/lib/email.ts` | Add notification email helpers + unsubscribe token logic |
| `web/src/lib/notifications.ts` | Hook notification creation to trigger email flow |
| `web/src/app/(app)/settings/page.tsx` | Add email preferences section |
| `web/src/app/(app)/admin/email/` | New admin email section (queue, compose, settings) |
| `web/src/app/api/unsubscribe/route.ts` | One-click unsubscribe handler (public, signed token) |
| `web/src/app/api/cron/send-campaigns/route.ts` | Vercel cron for scheduled campaign sends |
| `web/supabase/migrations/` | New tables: email_preferences, email_campaigns, email_campaign_items, email_sends, notification_email_log |

---

## Verification

### Notification emails
- Trigger a drill rating → confirm email arrives in inbox
- Trigger 4 rapid notifications → confirm burst email fires instead of 4 individual emails
- Opt out of drill ratings in Settings → trigger rating → confirm no email sent
- Click footer unsubscribe link → confirm preference saved without login

### Campaign system
- Publish a public drill → confirm auto-draft appears in `/admin/email`
- Publish 5 drills → confirm they batch and draft marked "ready"
- Approve button locked until test send completed
- Schedule email → confirm Vercel cron fires at correct time
- Send to "Coaches only" → confirm only coach-role users receive it

### Compliance
- Every email has both footer unsubscribe links
- One-click unsubscribe works without being logged in
- Opted-out users excluded from all subsequent sends of that category
