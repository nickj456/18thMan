# Player Communication Hub — Design

## Problem

Coaches routinely tell young players to "communicate more," but the instruction rarely works: players stay quiet because they feel stupid, lack confidence, or genuinely don't know what to say. 18th Man currently has no content treating communication as a coachable skill in the way it treats passing, tackling, or decision-making.

## Goals (v1)

- Give coaches a single, practical reference for teaching rugby league communication as a skill, built around the **SEE IT → SAY IT → SOLVE IT** framework.
- Present a clear 4-level progression (Find Your Voice → Share Information → Organise Others → Lead) with example calls per level.
- Provide ready-to-run drills/games that build communication naturally.
- Give coaches practical principles for developing quiet players into confident communicators and communicators into leaders.
- Ship as pure content — no new database tables, no tracking, no admin authoring UI.

## Non-goals (explicitly deferred)

- Club-level shared/editable vocabulary libraries.
- Per-player or per-team progression tracking through the levels.
- Linking drills/games in this section to real entries in the `drills` or `session_plans` library (that requires the separate, not-yet-designed "admin-curated session plan library" feature).
- Any admin CMS/editing UI for this content — it ships hardcoded, like `how-to`.

## Approach

Follow the existing `how-to/page.tsx` pattern exactly: a single client-rendered page under `(app)`, sticky anchored sub-navigation, icon-coded sections with the existing colour-badge convention (`text-{colour}-400 bg-{colour}-500/10 border-{colour}-500/20`).

**Route**: `web/src/app/(app)/communication/page.tsx`
**Nav entry**: added to `app-sidebar.tsx` in the same group as Positions Guide / Age Groups Guide / Fundamental Skills / How-to, labeled **"Player Communication"**, icon `MessagesSquare` (lucide-react), href `/communication`.

No new Supabase tables, migrations, or types. No Server Actions. No new dependencies.

## Page structure

Single scrollable page, sections in order:

### 1. Philosophy banner
Headline: "Don't tell players to communicate. Teach them the language." The SEE IT → SAY IT → SOLVE IT framework shown as a 3-step visual strip (icon + one-line definition per step).

### 2. SEE IT / SAY IT / SOLVE IT breakdown
- **SEE IT**: what players should learn to notice — space, numbers, an overlap, a defender shooting out, a disconnected defender, a mismatch, a short side, a teammate out of position.
- **SAY IT**: short trigger words beat long sentences. Two side-by-side call glossaries:
  - Attacking calls: BALL, UNDERS, OUT, LEFT, RIGHT, SHORT, HOLD, ONE MORE.
  - Defensive calls: SET, UP, HOLD, PUSH, TIGHT, MINE, LEFT, RIGHT.
- **SOLVE IT**: the call must lead to an action — the aim is better decisions, not noise.

### 3. The 4 Levels
Linear scroll, each level as a distinct colour-banded section (consistent with `how-to`'s section banding):

- **Level 1 — Find Your Voice**: communicating for yourself. Example: BALL, UNDERS, OUT.
- **Level 2 — Share Information**: telling teammates what you see. Example: LEFT, RIGHT, SHORT, NUMBERS.
- **Level 3 — Organise Others**: directing teammates. Example: GET DEEP, HOLD WIDTH, PUSH, SET HERE, ONE MORE. Callout: particularly important for halfbacks, hookers, and fullbacks.
- **Level 4 — Lead**: communicating ahead of problems — organising shape, defensive numbers, and the next play before it's needed.

Each level includes a short "who this is for" note (rough age/experience framing lives here rather than as a separate age-group section, to avoid duplicating the existing Age Groups Guide) and references 1–2 relevant drills from Section 4 by name.

### 4. Drills & Games
Four self-contained cards (setup, rules, coaching points, target level) — no links out to the real drill/session library:

- **No Call, No Pass** — 2v1 / 3v2, support player must communicate before receiving the ball.
- **Silent Game** — small-sided game with no talking allowed; stop and debrief on missed information, then replay with communication on.
- **Communication Bonus** — normal try = 1 point, a try involving clear useful communication calls = 2 points.
- **Information Before Possession** — players must state what they see before receiving the ball, not just call for it.

### 5. Coaching Principles
Scannable list of the 5 principles: say the obvious; short beats clever; early beats loud; communication must help somebody act; don't write off quiet players as poor communicators — give them language and confidence first.

Two short subsections beneath it:
- **Helping Quiet Players** — practical, non-generic advice (start at Level 1, low-pressure reps, praise attempts not volume).
- **Developing Leaders** — how Level 3/4 communicators (especially halfback/hooker/fullback) get grown deliberately.

## Content tone

Rugby league specific throughout — every example uses real rugby league scenarios (2v1s, defensive line speed, short-side plays). No generic sports-psychology framing ("active listening," "growth mindset," etc.).

## Testing

Static content page — no business logic to unit test. Verify via `npm run test` (no regressions), `tsc --noEmit`, and a manual browser check of the page (desktop + mobile width) once built, per the project's "test UI changes in a browser" rule.
