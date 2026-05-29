# Help Widget — Design Spec

**Date:** 2026-05-29
**Status:** Approved

---

## Overview

A floating AI-powered support widget available on every authenticated page. The AI handles platform how-to questions, account/billing queries, and GameSenseRL methodology questions. If the AI cannot resolve an issue, or the user explicitly asks to contact a human, it surfaces the admin email `hello@18thman.app`. The widget is non-intrusive and fully dismissible.

---

## User Experience

### Widget States

**Collapsed (default)**
- Small circular button, fixed bottom-right corner
- `HelpCircle` icon, brand orange (`#e8560a`)
- Subtle pulse animation on first visit only (tracked in `localStorage`, never repeats)
- If dismissed persistently, replaced by a small "Help" text link in the sidebar footer

**Expanded**
- `380px × 520px` panel anchored bottom-right, `position: fixed`
- Overlays all page content including the Konva canvas and modals
- Dark zinc theme (`bg-zinc-900 border-zinc-800`) matching the app

### Panel Structure

```
┌─────────────────────────────┐
│ 18th Man Support        [×] │  ← header + close button
├─────────────────────────────┤
│                             │
│  [AI messages stream here]  │  ← scrollable message list
│                             │
│  [Quick-tap chips]          │  ← shown on first open only
│  · How do I use…            │
│  · Billing question         │
│  · GameSense methodology    │
│                             │
├─────────────────────────────┤
│ [Type your question…]  [→]  │  ← input + send
├─────────────────────────────┤
│        Don't show this      │  ← persistent dismiss link
└─────────────────────────────┘
```

### Message Display
- User messages: right-aligned
- AI messages: left-aligned with a small bot avatar
- AI responses stream in (not wait-then-display)
- Admin email rendered as a styled `mailto:hello@18thman.app` link when offered by the AI

### Dismissal Behaviour
- **Close button (×)** — collapses panel to button, resets on next page load (session-only)
- **"Don't show this"** — sets `helpWidgetDismissed: true` in `localStorage`; hides the floating button entirely
- **Re-enable** — a small "Help" text link in the sidebar footer clears the flag and restores the widget
- **First-visit pulse** — tracked separately as `helpWidgetPulseSeen: true`; pulse never replays

---

## Architecture

### Component: `<HelpWidget />`

- Client component (`'use client'`)
- Added once to the root authenticated layout (`web/src/app/(app)/layout.tsx`)
- Manages local conversation state — **no Supabase persistence** (support chats are ephemeral)
- Reads `localStorage` for dismiss and pulse-seen flags
- Calls `POST /api/help-chat` and streams the response via Vercel AI SDK `useChat`

### Route Handler: `POST /api/help-chat`

- Server-side only — never exposes API keys to the client
- Fetches the user's profile (role, club name, subscription tier, trial status) from Supabase
- Constructs the system prompt dynamically (see below)
- Streams response using `streamText` from Vercel AI SDK with model `anthropic/claude-sonnet-4-6` via AI Gateway

### Knowledge Files

| File | Purpose |
|------|---------|
| `web/src/lib/help/platform-guide.md` | Written summary of every platform feature — navigation, drills, sessions, groups, game stats, game plans, AI chat, clubs, podcasts, wellbeing, admin |
| `web/GameSenseRL.md` | Existing GameSenseRL methodology content (already in repo) |

Both files are read at request time and injected into the system prompt as static text.

---

## System Prompt Design

```
You are the 18th Man support assistant. You help coaches and users with:
- How to use the 18th Man platform (features, navigation, account)
- Their account and subscription (personalised based on context below)
- The GameSenseRL coaching methodology

Rules:
- Be concise and direct. No padding.
- If asked about specific drills or drill content, direct the user to the Drill Library (/drills).
- If you cannot answer a question, or the user asks to speak to a human or contact the admin,
  offer the email address hello@18thman.app and note that responses are typically within 24 hours.
- Do not hallucinate features or policies.

User context:
- Name: {display_name}
- Role: {role}
- Club: {club_name | "No club"}
- Subscription tier: {tier}
- On trial: {yes | no}

--- PLATFORM GUIDE ---
{contents of platform-guide.md}

--- GAMESENSERL METHODOLOGY ---
{contents of GameSenseRL.md}
```

---

## Rate Limiting

Enforced server-side in the Route Handler — never trust the client to self-throttle.

**Limits (per authenticated user):**
- **20 messages per hour** — sliding window, resets rolling 60 minutes
- **50 messages per day** — calendar day in UTC

**Implementation:** Supabase table `help_chat_requests` with columns `user_id`, `created_at`. The Route Handler counts rows for the user within the relevant window before invoking the AI. No cron cleanup needed — rows older than 24 hours are irrelevant and can be pruned by a periodic Supabase function or simply ignored by the query.

**When the limit is hit:**
- Route Handler returns `429` with a JSON body `{ error: "rate_limited", resetAt: <ISO timestamp> }`
- Widget displays a friendly inline message: "You've reached the support limit for now. Try again after [time], or email hello@18thman.app directly."
- Input is disabled until the window resets (widget shows remaining wait time)

**Admin exemption:** Users with `role = 'admin'` bypass rate limiting entirely.

**New migration:** `063_help_chat_requests.sql` — creates the table with RLS (users can only insert their own rows; service role reads all for admin inspection if needed).

**Files to add:**

| Action | Path |
|--------|------|
| Create | `web/supabase/migrations/063_help_chat_requests.sql` |

---

## Out of Scope

- Drill content recommendations → redirect to `/drills`
- Conversation history across sessions (ephemeral, localStorage only)
- Admin-side inbox for received messages (email handles this)
- Push notifications for support queries

---

## Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `web/src/components/help/HelpWidget.tsx` |
| Create | `web/src/app/api/help-chat/route.ts` |
| Create | `web/src/lib/help/platform-guide.md` |
| Modify | `web/src/app/(app)/layout.tsx` — add `<HelpWidget />` |
| Modify | Sidebar component — add "Help" text link for dismissed state |
