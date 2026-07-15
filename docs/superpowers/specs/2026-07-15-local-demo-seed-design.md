# Local Demo Seed Script

## Purpose

The user is starting a YouTube series demonstrating how to use 18th Man. Recording against production would either expose real coach/user data or force navigating a mostly-empty account. This adds a repeatable, disposable local sandbox: one command resets the local Supabase instance to a realistic, lived-in demo state safe to put on camera.

## Scope

- **Local only.** No new Vercel environment, no new Supabase project, no production changes. Runs against the existing local Supabase dev stack (`http://127.0.0.1:54321`).
- One command produces a consistent, repeatable demo state from a clean database.
- Not designed to be re-run against a dirty/non-reset database — always follows `supabase db reset`.

## Data seeded

1. **Auth users (5)** — created via `supabase.auth.admin.createUser()` with `email_confirm: true` (no email step needed locally):
   - 1 club admin / head coach
   - 3 assistant coaches (club members)
   - 1 free-tier coach with no club (demonstrates trial/upgrade prompts)
   - Fixed, documented credentials (e.g. `demo.headcoach@18thman.local` / `Demo1234!`), printed to stdout at the end of the run.
2. **1 club** (`club` subscription tier) with the 4 club-affiliated users as members, head coach as club admin.
3. **~18 drills** spread across the existing `drill_categories` (Attack, Defence, Kicking, Fitness, Handling, Set Plays, Warm Up), each with valid non-empty `canvas_json` (cones/players/arrows via React Konva's shape schema, not blank canvases), a mix of authors, and a few with ratings/comments from other demo users.
4. **2 session plans** built from the seeded drills, one authored by the head coach, referencing `drills_order` (jsonb).
5. **1 coaching group** under the club, with a shared session plan.
6. **Community + DM activity**: a couple of community discussion threads and a short DM exchange between demo users, so `/chat` and community screens aren't empty on first load.

## Implementation

- New file: `web/scripts/seed-demo.ts`.
- `tsx` is not currently a devDependency — add it (`npm install -D tsx`) to run the TS seed script directly.
- New `package.json` script: `"seed:demo": "tsx scripts/seed-demo.ts"`.
- Uses the service-role Supabase client (same credentials pattern as `createServiceClient()` in `web/src/lib/supabase/service.ts`), reading local `.env.local` values.
- Idempotency guard: checks for the demo club by a fixed, recognizable slug/name before inserting; if found, the script exits early with a message telling the user to `supabase db reset` first rather than silently duplicating data.
- Normal recording workflow: `supabase db reset && npm run seed:demo` from `web/`.

## Non-goals

- No deployed/hosted sandbox environment (explicitly local-only per user's answer).
- No automatic teardown — `supabase db reset` before the next recording session is the reset mechanism.
- No production or Vercel preview environment changes.

## Testing

- No automated test required — this is a dev-tooling script, not shipped product code. Manual verification: run `supabase db reset && npm run seed:demo`, confirm the printed credentials work at `/login`, and spot-check the dashboard, drill library, session plan, and community/chat screens are populated.
