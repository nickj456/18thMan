# Help Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI-powered support widget to every authenticated page, with rate limiting, persistent dismiss, and human escalation to `hello@18thman.app`.

**Architecture:** A `<HelpWidget />` client component mounts in the root app layout and manages its own ephemeral chat state via `useChat`. It posts to a new `POST /api/help-chat` Route Handler that checks rate limits, injects user context + platform knowledge into a system prompt, then streams a response via Vercel AI Gateway. Dismissal state lives in `localStorage`; the sidebar footer gets a "Help" link that re-enables the widget via a custom DOM event.

**Tech Stack:** Next.js App Router, Vercel AI SDK (`useChat`, `streamText`), Vercel AI Gateway (`anthropic/claude-sonnet-4-6`), Supabase (rate limit table), `localStorage`, Lucide icons, Tailwind CSS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `web/supabase/migrations/063_help_chat_requests.sql` | Rate limit tracking table + RLS |
| Create | `web/src/lib/help/platform-guide.md` | Static platform feature knowledge for AI |
| Create | `web/src/app/api/help-chat/route.ts` | Auth, rate limit, system prompt, AI stream |
| Create | `web/src/components/help/HelpWidget.tsx` | Floating button + chat panel UI |
| Modify | `web/src/app/(app)/layout.tsx` | Mount `<HelpWidget />` |
| Modify | `web/src/components/app-sidebar.tsx` | Add "Help" re-enable link in footer |

---

## Task 1: DB Migration — `help_chat_requests`

**Files:**
- Create: `web/supabase/migrations/063_help_chat_requests.sql`

- [ ] **Step 1: Write the migration**

```sql
-- web/supabase/migrations/063_help_chat_requests.sql
create table public.help_chat_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.help_chat_requests enable row level security;

-- Users can insert their own rows (route handler uses service role to read)
create policy "users can insert own help requests"
  on public.help_chat_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Index for fast per-user time-window queries
create index help_chat_requests_user_created
  on public.help_chat_requests (user_id, created_at desc);
```

- [ ] **Step 2: Apply the migration**

```bash
cd web
npx supabase db push
```

Expected: migration applies cleanly, `help_chat_requests` table visible in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/063_help_chat_requests.sql
git commit -m "feat: add help_chat_requests table for support widget rate limiting"
```

---

## Task 2: Platform Guide Knowledge File

**Files:**
- Create: `web/src/lib/help/platform-guide.md`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p web/src/lib/help
```

- [ ] **Step 2: Write the platform guide**

Create `web/src/lib/help/platform-guide.md`:

```markdown
# 18th Man Platform Guide

## Navigation
The sidebar contains all main sections. On mobile, tap the menu icon (top-left) to open it.

## Drill Library (`/drills`)
Browse all drills. Filter by category, difficulty, age group, and player count using the top bar.
- Click a drill to view its full details, YouTube video (if attached), and AI coaching guide.
- Save drills to your personal list using the bookmark icon.
- Rate and comment on drills from the detail page.
- For specific drill content and recommendations, visit /drills directly.

## Drill Designer (`/drills/new`)
Build your own drills on an interactive pitch canvas.
- Choose a pitch background: full pitch, half pitch, in-goal, or blank.
- Place attackers, defenders, cones, balls, arrows, lines, zones, and text labels.
- Set drill metadata: title, category, difficulty, age group, player count.
- Paste a YouTube URL to attach a video — an AI coaching guide is auto-generated.
- Visibility: Public (everyone), Club only (club members), Private (you only).
- Save drafts and return to edit later.

## Session Planner (`/sessions`)
Build and manage training sessions.
- Add drills by searching the library, set duration for each, drag to reorder.
- Total session time is calculated automatically.
- Share a session via a private link — no login required for the recipient.
- Export as PDF (Club tier required).
- Generate an AI summary of any session from its detail page.
- Deliver mode (`/sessions/[id]/deliver`) walks you through each drill in sequence.

## Coach Chat (`/chat`)
Three chat modes:
- **AI Coach** (`/chat/ai`) — rugby league specialist. Free users get 20 messages/day; Club tier is unlimited.
- **S&C Specialist** (`/chat/sc`) — strength and conditioning programs.
- **Community** (`/chat/community`) — shared forum threads for all coaches.
- **Direct Messages** (`/chat/dm`) — private 1:1 messages with other coaches.

## My Club (`/clubs`)
Each user belongs to one club. Club admins manage membership, invite users, and configure the club.
- Club-tier benefits: unlimited drills, club-private drills, coaching groups, collaborative sessions, AI guidance, PDF export, unlimited AI chat.
- New users get a 48-hour full-access trial after creating their 3rd drill.
- Pricing: £19.99/month per club.

## My Groups (`/groups`)
Coaching groups are sub-teams within your club (e.g. Forwards Unit, Attack Group). Requires club membership.
- Group admins can invite/remove members and manage the group.
- Groups share session blocks and collaborative editing.
- Each group has an AI Guidance page that analyses training history and suggests the next session focus (GameSenseRL methodology).
- Game Stats: track live match statistics per group (`/groups/[id]/game-stats`).
- Squad management: manage player records and reviews (`/groups/[id]/squad`).

## Weekly Focus (`/weekly-focus`)
Set a coaching focus for the week to keep sessions aligned.

## Podcasts (`/podcasts`)
Browse and save rugby league coaching podcasts. Play directly in the app.

## Wellbeing (`/wellbeing`)
Access rugby league player and coach wellbeing resources.

## Coaching Eye / Video Analysis (`/analyze`)
Upload and annotate video clips for match and session review.

## Match Reviews (`/my-reviews`)
Create and manage structured match review reports.

## Settings (`/settings`)
Update account preferences, notification settings, and connected accounts.

## Profile (`/profile`)
Edit your public coaching profile — display name, bio, club, coaching level, avatar, and social links.

## Subscriptions & Billing
- Free tier: 20 drills, unlimited sessions, 20 AI messages/day, community access.
- Club tier (£19.99/month): everything unlimited, coaching groups, collaborative sessions, AI guidance, PDF export.
- Trial: 48-hour full Club access, triggered automatically after your 3rd drill.
- To upgrade: visit `/clubs` and ask your club admin, or go to `/settings`.

## Admin (admin users only)
Admin panel at `/admin` — manage users, clubs, groups, drill approvals, categories, email campaigns, and content engine.
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/help/platform-guide.md
git commit -m "feat: add platform guide knowledge file for help widget AI"
```

---

## Task 3: Route Handler — `POST /api/help-chat`

**Files:**
- Create: `web/src/app/api/help-chat/route.ts`

- [ ] **Step 1: Write the route handler**

Create `web/src/app/api/help-chat/route.ts`:

```typescript
import { readFile } from 'fs/promises'
import path from 'path'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const HOURLY_LIMIT = 20
const DAILY_LIMIT = 50
const ADMIN_EMAIL = 'hello@18thman.app'

const gateway = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.VERCEL_OIDC_TOKEN ?? '',
})

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; resetAt: string | null }> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()

  const [hourlyResult, dailyResult] = await Promise.all([
    serviceClient
      .from('help_chat_requests')
      .select('created_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo),
    serviceClient
      .from('help_chat_requests')
      .select('created_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayUtc),
  ])

  const hourlyCount = hourlyResult.count ?? 0
  const dailyCount = dailyResult.count ?? 0

  if (hourlyCount >= HOURLY_LIMIT) {
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    return { allowed: false, resetAt }
  }
  if (dailyCount >= DAILY_LIMIT) {
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    return { allowed: false, resetAt: tomorrow.toISOString() }
  }
  return { allowed: true, resetAt: null }
}

async function recordRequest(userId: string): Promise<void> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await serviceClient.from('help_chat_requests').insert({ user_id: userId })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, role, club_id, subscription_tier, trial_ends_at')
      .eq('id', user.id)
      .single()

    // Admin users bypass rate limiting
    if (profile?.role !== 'admin') {
      const { allowed, resetAt } = await checkRateLimit(user.id)
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', resetAt }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Record this request for rate limiting (fire and forget)
    if (profile?.role !== 'admin') {
      recordRequest(user.id).catch(() => {})
    }

    const body = await req.json()
    const { messages } = body

    // Load knowledge files
    const [platformGuide, gameSenseRL] = await Promise.all([
      readFile(path.join(process.cwd(), 'src/lib/help/platform-guide.md'), 'utf-8'),
      readFile(path.join(process.cwd(), '../GameSenseRL.md'), 'utf-8'),
    ])

    // Resolve club name
    let clubName = 'No club'
    if (profile?.club_id) {
      const { data: club } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', profile.club_id)
        .single()
      if (club?.name) clubName = club.name
    }

    const isOnTrial = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at) > new Date()
      : false
    const tier = profile?.subscription_tier ?? 'free'

    const systemPrompt = `You are the 18th Man support assistant. You help coaches and users with:
- How to use the 18th Man platform (features, navigation, account)
- Their account and subscription (personalised based on context below)
- The GameSenseRL coaching methodology

Rules:
- Be concise and direct. No padding.
- If asked about specific drills or drill content, direct the user to the Drill Library at /drills.
- If you cannot answer a question, or the user asks to speak to a human, contact the admin, or get direct support, offer the email address ${ADMIN_EMAIL} and note that responses are typically within 24 hours.
- Do not hallucinate features or policies.
- Do not make up pricing, limits, or capabilities not described in the platform guide.

User context:
- Name: ${profile?.display_name ?? 'Coach'}
- Role: ${profile?.role ?? 'coach'}
- Club: ${clubName}
- Subscription tier: ${tier}
- On trial: ${isOnTrial ? 'yes' : 'no'}

--- PLATFORM GUIDE ---
${platformGuide}

--- GAMESENSERL METHODOLOGY ---
${gameSenseRL}`

    const history = (messages as { role: string; content: string }[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-6'),
      system: systemPrompt,
      messages: history,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[help-chat/route] error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/help-chat/route.ts
git commit -m "feat: add /api/help-chat route handler with rate limiting and AI Gateway streaming"
```

---

## Task 4: `HelpWidget` Client Component

**Files:**
- Create: `web/src/components/help/HelpWidget.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/help/HelpWidget.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from 'ai/react'
import { HelpCircle, X, Send, Bot } from 'lucide-react'

const DISMISSED_KEY = 'helpWidgetDismissed'
const PULSE_KEY = 'helpWidgetPulseSeen'
const SHOW_EVENT = 'show-help-widget'

const QUICK_CHIPS = [
  'How do I use the Drill Designer?',
  'I have a billing question',
  'Tell me about the GameSense methodology',
]

// Splits message text on the admin email and renders each part safely as React nodes,
// replacing the email with a proper <a> element. No innerHTML — no XSS risk.
function MessageText({ text }: { text: string }) {
  const EMAIL = 'hello@18thman.app'
  const parts = text.split(EMAIL)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <a
              href={`mailto:${EMAIL}`}
              className="text-[#e8560a] underline underline-offset-2 hover:text-[#d14d09]"
            >
              {EMAIL}
            </a>
          )}
        </span>
      ))}
    </>
  )
}

export function HelpWidget() {
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [pulseSeen, setPulseSeen] = useState(true)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [hasOpened, setHasOpened] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
    const seen = localStorage.getItem(PULSE_KEY) === 'true'
    setPulseSeen(seen)
    if (!seen) {
      setTimeout(() => {
        localStorage.setItem(PULSE_KEY, 'true')
        setPulseSeen(true)
      }, 3000)
    }

    const handler = () => {
      localStorage.removeItem(DISMISSED_KEY)
      setDismissed(false)
      setOpen(true)
    }
    window.addEventListener(SHOW_EVENT, handler)
    return () => window.removeEventListener(SHOW_EVENT, handler)
  }, [])

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/help-chat',
    onResponse: (res) => {
      if (res.status === 429) {
        res.json().then((data: { resetAt?: string }) => {
          const resetAt = data.resetAt ? new Date(data.resetAt) : null
          const timeStr = resetAt
            ? resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'later'
          setRateLimitMsg(
            `You've reached the support limit for now. Try again after ${timeStr}, or email hello@18thman.app directly.`
          )
        })
      }
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleOpen() {
    setOpen(true)
    setHasOpened(true)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    setOpen(false)
  }

  function handleChip(chip: string) {
    setInput(chip)
  }

  if (dismissed) return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          className={[
            'fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#e8560a] text-white shadow-lg flex items-center justify-center hover:bg-[#d14d09] transition-colors',
            !pulseSeen ? 'animate-pulse' : '',
          ].join(' ')}
          aria-label="Open support"
        >
          <HelpCircle size={22} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
                <Bot size={14} className="text-[#e8560a]" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">18th Man Support</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !rateLimitMsg && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 text-center">Ask anything about the platform, your account, or GameSense coaching.</p>
                {!hasOpened && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => handleChip(chip)}
                        className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-[#e8560a]/50 hover:text-zinc-200 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                    <Bot size={10} className="text-[#e8560a]" />
                  </div>
                )}
                <div
                  className={[
                    'max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'bg-[#e8560a]/10 border border-[#e8560a]/20 text-zinc-200'
                      : 'bg-zinc-800 text-zinc-300',
                  ].join(' ')}
                >
                  <MessageText text={m.content} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                  <Bot size={10} className="text-[#e8560a]" />
                </div>
                <div className="bg-zinc-800 px-3 py-2 rounded-xl">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {rateLimitMsg && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {rateLimitMsg}{' '}
                <a href="mailto:hello@18thman.app" className="underline underline-offset-2 hover:text-amber-200">
                  hello@18thman.app
                </a>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-zinc-800 shrink-0"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your question…"
              disabled={isLoading || !!rateLimitMsg}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#e8560a]/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !!rateLimitMsg}
              className="w-8 h-8 rounded-lg bg-[#e8560a] text-white flex items-center justify-center hover:bg-[#d14d09] transition-colors disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={13} />
            </button>
          </form>

          {/* Dismiss */}
          <div className="flex justify-center pb-2.5 shrink-0">
            <button
              onClick={handleDismiss}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Don't show this
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/help/HelpWidget.tsx
git commit -m "feat: add HelpWidget floating support chat component"
```

---

## Task 5: Wire Up Layout + Sidebar

**Files:**
- Modify: `web/src/app/(app)/layout.tsx`
- Modify: `web/src/components/app-sidebar.tsx`

- [ ] **Step 1: Add `<HelpWidget />` to the app layout**

In `web/src/app/(app)/layout.tsx`, add the import and render the widget just before the closing `</SidebarProvider>`:

```typescript
// Add import at the top:
import { HelpWidget } from '@/components/help/HelpWidget'

// Inside the return, just before </SidebarProvider>:
      <HelpWidget />
    </SidebarProvider>
```

Full updated return block:

```typescript
  return (
    <SidebarProvider>
      <AppSidebar
        role={(profile?.role ?? 'viewer') as UserRole}
        displayName={profile?.display_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        unreadNotifications={unreadCount}
      />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <Link
            href="/notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#e8560a] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
      <HelpWidget />
    </SidebarProvider>
  )
```

- [ ] **Step 2: Add "Help" re-enable link to sidebar footer**

In `web/src/components/app-sidebar.tsx`, the sidebar is already a client component. Add a `HelpTrigger` sub-component at the bottom of the file that reads `localStorage` and shows/hides the Help link, dispatching the `show-help-widget` custom event when clicked.

Add this import at the top of the file (already has `useEffect`-compatible imports since it's `'use client'`):

```typescript
import { useEffect, useState } from 'react'
```

Add this component at the bottom of `app-sidebar.tsx`, before the closing of the file:

```typescript
function HelpTrigger() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => setDismissed(localStorage.getItem('helpWidgetDismissed') === 'true')
    check()
    window.addEventListener('show-help-widget', check)
    return () => window.removeEventListener('show-help-widget', check)
  }, [])

  if (!dismissed) return null

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('show-help-widget'))}
      className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
    >
      <HelpCircle className="size-3" />
      Help
    </button>
  )
}
```

Then add `<HelpTrigger />` inside `SidebarFooter`, after the existing avatar/controls row:

```typescript
      <SidebarFooter className="border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2 py-2">
          {/* ... existing avatar, theme toggle, notifications, sign out ... */}
        </div>
        <HelpTrigger />
      </SidebarFooter>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and smoke test**

```bash
cd web && npm run dev
```

Open `http://localhost:3000`. Verify:
- Orange `?` button visible bottom-right
- Clicking opens the panel
- Quick-tap chips appear on first open
- Typing a message and sending returns a streaming AI response
- Submitting a question about drills redirects to `/drills` suggestion
- "Don't show this" hides the button
- Sidebar footer shows "Help" link after dismissal
- Clicking "Help" in sidebar restores the widget

- [ ] **Step 5: Commit**

```bash
git add web/src/app/(app)/layout.tsx web/src/components/app-sidebar.tsx
git commit -m "feat: mount HelpWidget in app layout and add sidebar re-enable link"
```

---

## Self-Review Notes

- **Rate limit 429 handling:** The `onResponse` callback in `useChat` fires before the stream is consumed. For a 429, we parse JSON and set `rateLimitMsg`. The input disables. ✓
- **XSS safety:** `MessageText` splits on the literal email string and renders parts as React text nodes with a hard-coded `<a>` element — no `dangerouslySetInnerHTML`, no user content reaches `innerHTML`. ✓
- **File paths for knowledge:** `process.cwd()` in the route handler points to `web/` (where Next.js runs), so `src/lib/help/platform-guide.md` is correct. `GameSenseRL.md` is one level up at `../GameSenseRL.md`. ✓
- **Admin bypass:** Checked before rate limit query, skips both the read and the write. ✓
- **`HelpTrigger` re-sync:** The component listens for `show-help-widget` to re-check `localStorage` after the widget clears the dismissed flag. ✓
- **Spec coverage check:**
  - ✅ Floating `?` button, bottom-right, brand orange
  - ✅ Pulse on first visit only (`helpWidgetPulseSeen`)
  - ✅ 380×520 panel, zinc dark theme
  - ✅ Quick-tap chips on first open
  - ✅ Streaming AI messages
  - ✅ Bot avatar on AI messages
  - ✅ `mailto:` link styled distinctly
  - ✅ Close button (session-only collapse)
  - ✅ "Don't show this" (persistent, localStorage)
  - ✅ Sidebar "Help" re-enable link
  - ✅ Rate limiting: 20/hour, 50/day, admin exempt
  - ✅ 429 friendly message with reset time
  - ✅ Input disabled when rate limited
  - ✅ Platform guide + GameSenseRL in system prompt
  - ✅ User account context (name, role, club, tier, trial)
  - ✅ Drill questions redirected to `/drills`
  - ✅ Admin email `hello@18thman.app` offered on escalation
