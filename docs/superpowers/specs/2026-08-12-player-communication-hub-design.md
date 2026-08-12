# Player Communication Hub — Design

## Problem

Coaches routinely tell young players to "communicate more," but the instruction rarely works: players stay quiet because they feel stupid, lack confidence, or genuinely don't know what to say. 18th Man currently has no content treating communication as a coachable skill in the way it treats passing, tackling, or decision-making. This feature fixes that gap with a dedicated, rugby-league-specific reference coaches can actually use on the training paddock.

Core philosophy, stated up front on the page itself: **Don't tell players to communicate. Teach them the language.**

## Goals (v1)

- Give coaches a single, practical reference for teaching communication as a skill, built around the **SEE IT → SAY IT → SOLVE IT** framework.
- Present a clear 4-level progression (Find Your Voice → Share Information → Organise Others → Lead) with example calls, who each level is for, and age-appropriate framing per level.
- Provide four ready-to-run drills/games that build communication naturally, each fully specified (setup, rules, coaching points, target level).
- Give coaches concrete, non-generic advice for developing quiet players into confident communicators, and communicators into on-field leaders.
- Ship as pure content — no new database tables, no tracking, no admin authoring UI, no linking into the real drills/sessions library.

## Non-goals (explicitly deferred — not in this spec, not in this build)

- Club-level shared/editable vocabulary libraries (clubs picking their own terminology set).
- Per-player or per-team progression tracking through the levels.
- Linking drills/games in this section to real entries in the `drills` or `session_plans` library — that depends on the separate, not-yet-designed "admin-curated session plan library" feature the user flagged during brainstorming as a distinct future project.
- Any admin CMS/editing UI for this content — it ships hardcoded in the repo, same as `how-to`.
- Any i18n/localisation of terminology.

These are deferred, not rejected — worth another spec once v1 is validated with real coaches.

## Approach

Follow the existing `web/src/app/(app)/how-to/page.tsx` pattern exactly, since it's the closest analog already in the codebase (long-form reference content, sticky anchored sub-nav, icon-coded sections) and reusing it keeps this feature visually and structurally consistent with the rest of `(app)`.

**Route**: `web/src/app/(app)/communication/page.tsx` — client component (`'use client'`), no data fetching, no Server Actions, no new Supabase types. Content is a typed in-file data structure, same shape as `how-to`'s `Section[]`.

**Nav entry**: add to `app-sidebar.tsx` in the resources group, alongside Positions Guide / Age Groups Guide / Fundamental Skills / How-to:

```ts
{ href: '/communication', label: 'Player Communication', icon: MessagesSquare },
```

Placed directly above `/how-to` in that group, since it's a coaching-skill reference rather than an app-usage FAQ.

**No schema/DB changes, no migrations, no new dependencies.**

## Data shape

Mirror `how-to`'s pattern but adapted for this content's structure (framework steps, levels, drills, principles are distinct shapes, not uniform Q&A):

```ts
interface FrameworkStep { id: 'see' | 'say' | 'solve'; title: string; description: string; examples?: string[] }
interface Level { id: string; number: 1 | 2 | 3 | 4; title: string; summary: string; exampleCalls: string[]; whoItsFor: string; ageNote: string; relatedDrillIds: string[] }
interface Drill { id: string; title: string; format: string; setup: string; rules: string; coachingPoints: string[]; targetLevel: number }
interface Principle { title: string; description: string }
```

## Page structure

Single scrollable page, sticky anchored sub-nav at top (Framework / Levels / Drills & Games / Principles), colour-banded sections consistent with `how-to`'s convention (`text-{colour}-400 bg-{colour}-500/10 border-{colour}-500/20`), each section gets its own accent colour so levels/drills are visually distinguishable while scrolling.

### 1. Philosophy banner

Headline: **"Don't tell players to communicate. Teach them the language."**
Sub-line: one sentence on why — players go quiet not from laziness but because they don't have the words, or fear getting it wrong.

The **SEE IT → SAY IT → SOLVE IT** framework rendered as a 3-step visual strip (icon + one-line definition each), linking down to Section 2 for detail.

### 2. SEE IT / SAY IT / SOLVE IT breakdown

- **SEE IT** — what players learn to notice on the field: space, numbers, an overlap, a defender shooting out, a disconnected defender, a mismatch, a short side, a teammate out of position. Framed as "the information," not yet the words.
- **SAY IT** — short trigger words beat long sentences; the words are what turn seeing into something teammates can use. Two side-by-side call glossaries, styled as compact card grids:
  - **Attacking calls**: BALL, UNDERS, OUT, LEFT, RIGHT, SHORT, HOLD, ONE MORE.
  - **Defensive calls**: SET, UP, HOLD, PUSH, TIGHT, MINE, LEFT, RIGHT.
  Each call gets a one-line meaning (e.g. "UNDERS — I'm running the short ball underneath you").
- **SOLVE IT** — the call must lead to an action; a call that doesn't help a teammate decide or move is just noise. One-line rule coaches can repeat on the field: *"If it didn't help someone act, it wasn't communication — it was noise."*

### 3. The 4 Levels

Linear scroll, each level as a distinct colour-banded section, in order:

**Level 1 — Find Your Voice**
Players learn to communicate for themselves before they're asked to communicate for anyone else. Example: `BALL`, `UNDERS`, `OUT`.
Who it's for: every player, every age, starting point for all communication coaching.
Age note: this is the entire target for juniors (U6–U12) — don't push further until calling for yourself is automatic and confident.
Related drills: Information Before Possession.

**Level 2 — Share Information**
Players start telling teammates what they can see, not just what they want. Example: `LEFT`, `RIGHT`, `SHORT`, `NUMBERS`.
Who it's for: players who've mastered Level 1 and are ready to look outward — typically mid-teens upward, but any age once Level 1 is solid.
Age note: introduce once a player calls confidently for themselves without prompting.
Related drills: No Call, No Pass; Information Before Possession.

**Level 3 — Organise Others**
Players start directing teammates, not just informing them. Example: `GET DEEP`, `HOLD WIDTH`, `PUSH`, `SET HERE`, `ONE MORE`.
Who it's for: **particularly important for halfbacks, hookers, and fullbacks** — the organising spine of the team — but any confident Level-2 player can be developed here.
Age note: realistic from open-age teens up; don't force it onto players who haven't found their voice yet.
Related drills: Silent Game; Communication Bonus.

**Level 4 — Lead**
Players communicate before problems happen — organising shape, defensive numbers, and the next play ahead of time rather than reacting to it. This is proactive, not reactive, communication.
Who it's for: senior organisers and captains-in-waiting; the ceiling of the framework, not a requirement for every player.
Age note: open age / representative level, generally.
Related drills: Silent Game; Communication Bonus.

### 4. Drills & Games

Four self-contained cards — fully specified, no links out to the real drill/session library:

**No Call, No Pass**
Format: 2v1 and 3v2 attacking situations.
Setup: standard 2v1/3v2 grid, attackers start with the ball at one end.
Rule: the support player must make a clear call (what they see, e.g. `OUT`, `SHORT`, `NUMBERS`) *before* they can receive the ball. A pass to a silent support player doesn't count / is called back.
Coaching points: reward the call, not just the try; a wrong-but-clear call still gets praised for effort — the goal is voice first, precision second.
Target level: 1–2.

**Silent Game**
Format: small-sided game (4v4 or similar).
Setup: normal rules, ball in play, but no talking allowed at all.
Rule: play a set period in total silence, then stop and ask the group what information they were missing and what mistakes it caused. Replay the same scenario with communication allowed and compare.
Coaching points: this is a contrast drill — the value of the debrief is as important as the play itself; let players articulate the gap themselves rather than telling them.
Target level: 2–4 (the debrief conversation scales with the group's level).

**Communication Bonus**
Format: any normal small-sided or full training game.
Setup: standard game rules and scoring.
Rule: a normal try scores 1 point; a try that involved several clear, useful communication calls (coach's judgement, called out live) scores 2 points.
Coaching points: coach must actively listen and call out qualifying tries in the moment — the bonus only works if players hear it recognised immediately, not at the end.
Target level: 3–4.

**Information Before Possession**
Format: any drill involving a pass or handover.
Setup: no special grid required — a rule laid over existing drills.
Rule: before a player can receive the ball, they must state what they see (not just call for the ball) — e.g. not just `BALL` but `BALL, OVERLAP LEFT`.
Coaching points: good for retrofitting onto drills the club already runs; forces the SEE IT step to happen out loud instead of staying silent in the player's head.
Target level: 1–2.

### 5. Coaching Principles

Scannable list, five entries:

1. **Say the obvious.** Players often stay quiet because they assume everyone else can already see what they see. Explicitly tell them: if you can see it, say it — assume nobody else has.
2. **Short beats clever.** One or two words a teammate can act on instantly beats a full sentence they have to process mid-play.
3. **Early beats loud.** Information delivered early and calmly is more useful than the same information shouted too late to act on.
4. **Communication must help somebody act.** If a call doesn't change what a teammate does, it's noise, not communication — hold every call to that bar.
5. **Don't write off quiet players as poor communicators.** Give them simple language and low-pressure reps before judging their communication — most "quiet" players are missing vocabulary and confidence, not willingness.

**Helping Quiet Players** — start every quiet player at Level 1 regardless of age or ability elsewhere; give them one or two words to own (e.g. just `BALL`) before asking for more; praise the attempt, not the volume or correctness; use low-pressure reps (2v1s, not full games) to build the habit before it's tested under pressure.

**Developing Leaders** — Level 3/4 communicators are grown deliberately, not discovered by accident. Identify players (especially halfbacks, hookers, fullbacks) who are solid at Level 2 and give them specific organising responsibilities in training (e.g. "you make the width call this set"); use Silent Game debriefs to let them articulate what the team needed to hear; build Level 4 by asking organisers to predict the next problem before it happens, not just react to the current one.

## Content tone

Rugby league specific throughout — every example uses real rugby league scenarios (2v1s, defensive line speed, short-side plays, halfback organisation). No generic sports-psychology framing ("active listening," "growth mindset," "psychological safety") anywhere on the page.

## Testing

Static content page — no business logic to unit test, so no new `*.test.ts(x)` file is required for the page itself. Verify via:
- `npm run test` — confirm no regressions elsewhere (e.g. sidebar snapshot/nav tests, if any exist).
- `npx tsc --noEmit` — typecheck the new page and data structures.
- Manual browser check once built: desktop and mobile viewport, sticky sub-nav scroll behaviour, dark-mode contrast on all colour-banded sections (project defaults to dark mode).
