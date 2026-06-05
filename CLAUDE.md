# 18th Man — Claude Code Instructions

Rugby league coaching platform. Full spec in [SPEC.md](SPEC.md).

---

## Project Overview

**18th Man** is a web app for rugby league coaches to design drills, plan training sessions, and connect with the coaching community. It includes an AI coaching assistant, a visual drill designer, and a community hub.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router, latest) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth & DB | Supabase (Postgres + Auth + Realtime) |
| Drill Designer | React Konva |
| AI Chat | Vercel AI SDK v6 + AI Gateway |
| Deployment | Vercel |

---

## Architecture Rules

### Next.js
- Use **App Router** exclusively — no Pages Router
- Default to **Server Components**; only add `'use client'` when interactivity or browser APIs are required
- Push `'use client'` boundaries as far down the tree as possible
- Use **Server Actions** for mutations (forms, data writes) — not Route Handlers
- Route Handlers are only for public APIs and webhooks
- All request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`
- Use `proxy.ts` (not `middleware.ts`) for auth checks and redirects — export must be named `proxy`, not `middleware`

### Supabase
- **Auth**: always use Supabase Auth — never roll your own auth
- **Realtime**: use Supabase subscriptions for Direct Messages and Community Discussions
- **RLS**: every table must have Row Level Security policies — never skip RLS
- **Types**: generate types from Supabase schema (`supabase gen types typescript`) and use them throughout
- Never use `@vercel/postgres` or `@vercel/kv` — they are sunset

### AI Chat
- Use **Vercel AI Gateway** with model strings like `'anthropic/claude-sonnet-4-6'` — never hardcode provider API keys
- Use `vercel env pull` to get OIDC credentials locally
- Stream all AI responses — never block on `generateText` for user-facing chat
- Render all AI-generated text using **AI Elements** (`<Message>` / `<MessageResponse>`) — never render raw markdown as `{text}`

### Styling
- Use **shadcn/ui** components — don't build core UI controls from scratch
- shadcn/ui uses **Base UI** — use `render={<Link href="..." />}` instead of `asChild` on Button and other primitives
- Default to **dark mode** (this is a dashboard/tool for coaches)
- Use **zinc/slate** neutral tokens with one accent colour
- Use **Geist Sans** for UI text, **Geist Mono** for code/stats/IDs

### Drill Designer
- Use **React Konva** for the canvas — don't substitute another canvas library
- Desktop-first layout; ensure tablet usability
- Canvas state stored as `canvas_json` (JSONB) in the `drills` table

---

## Roles & Permissions

Three roles: `admin`, `coach`, `viewer`. Stored on the `profiles` table.

- Always check role server-side (never trust client-side role checks alone)
- Use Supabase RLS policies to enforce permissions at the database level
- See full permissions table in [SPEC.md](SPEC.md)

---

## Database

Schema lives in Supabase. Core tables:

```
profiles              — id, username, display_name, avatar_url, bio, club, coaching_level, role
social_links          — user_id, platform, url
drill_categories      — id, name, slug, order, created_by
drills                — id, title, description, category_id, canvas_json, preview_image_url, author_id, difficulty, age_group, player_count
drill_ratings         — drill_id, user_id, rating, comment
conversations         — id, title, type (ai | dm | community), created_by
conversation_participants — conversation_id, user_id
messages              — id, conversation_id, sender_id, content, created_at
session_plans         — id, title, coach_id, drills_order (jsonb), total_duration
admin_user_notes      — user_id, note, updated_at (admin-only; separate from profiles to keep out of user-readable RLS)
```

Migration files go in `supabase/migrations/`. Always write migrations — never mutate the schema by hand in the dashboard.

---

## Project Structure

Next.js app lives in `web/`. Run all commands from `web/`.

```
web/
src/
app/
  (auth)/           — login, signup, password reset
  (app)/            — authenticated routes
    dashboard/
    drills/
    drills/[id]/
    drills/new/       — drill designer
    sessions/
    chat/
    profile/[username]/
    admin/
  api/              — route handlers (webhooks, public APIs only)
components/
  ui/               — shadcn/ui components
  drills/
  chat/
  designer/
  session/
lib/
  supabase/         — client, server, middleware helpers
  ai/               — AI SDK setup
supabase/
  migrations/
  seed.sql
```

---

## Do / Don't

**Do:**
- Read the current Supabase and Next.js docs before writing integration code — APIs change
- Use Supabase server client (not browser client) in Server Components and Server Actions
- Handle all three conversation types (ai, dm, community) through the shared `conversations` / `messages` schema
- Export PDFs for session plans and drill designer using a server-side approach (avoid client-only PDF libs that inflate bundle size)

**Don't:**
- Don't add `any` types — use the generated Supabase types
- Don't use `useEffect` to fetch data — use Server Components or React Query
- Don't store sensitive data (API keys, tokens) in client-accessible code
- Don't skip loading, empty, and error states — every async UI needs all three
- Don't build custom auth flows — Supabase handles it

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
