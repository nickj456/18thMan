# Coach DNA — Content Differentiation & Growth Resources

## Problem

After testing the DISC-style forced-choice assessment shipped in the previous sub-project, two content gaps surfaced:

1. **The 4 options per question aren't differentiated enough.** Each question already mixes 4 different categories (of the 8), but every option is written as "a reasonable response to the scenario" — so a competent coach genuinely sees several plausible answers and struggles to pick a clear least-like-me. The forced-choice mechanic only produces a meaningful signal if the options represent instinctively different coaching behaviors, not just different labels.
2. **Focus areas are too shallow to act on.** Each growth area is a single AI-written sentence with no concrete next step and no pointer to where a coach could actually go learn more.

## Scope

Both fixes touch the same output surface (the self-assessment content and results) and were chosen to ship together. No changes to the scoring mechanic, the most/least UI, or the question count — this is a content and output-depth pass on top of the already-shipped DISC forced-choice mechanic.

## Part 1: Rewording the 96 answer options

**Principle:** every option is rewritten to be anchored in a distinct, observable coaching behavior, not just a category label attached to a plausible sentence. Options separate along axes that naturally divide the 8 categories:

- Task-first vs. people-first
- Individual vs. team-level
- Immediate fix vs. long-term investment
- Directive vs. collaborative

Each option should read as something only that type of coach instinctively reaches for first — not wrong for the others, just not their reflex. Example (Q1, "planning next week's session after a scrappy loss"):

| Category | Old | New |
|---|---|---|
| Teacher | "Break down exactly what went wrong technically and drill it until it's second nature." | "Sit the team down and walk through the game frame by frame so everyone understands *why* it went wrong." |
| Technician | "Focus the session on a technical fix for the specific tackle-completion issue you spotted on video." | "Skip the debrief — go straight to the training ground and rebuild the exact technique that broke down." |
| Motivator | "Keep the session upbeat and focus on what the team did well, to rebuild confidence first." | "Lead with what went right. A flat, defeated team won't fix anything — confidence comes first." |
| Developer | "Use the loss as a long-term development marker, and plan the skill over the next month rather than this week." | "Don't overreact to one bad week — file it as a marker and keep the long-term plan on track." |

**Scope:** all 24 questions, all 96 options, rewritten. `category_weights_json` per option is unchanged (same category, same weight of 100) — only `option_text` changes. No schema change, no scoring change.

The full 96-option rewrite is content work to be enumerated in the implementation plan, following this principle and worked example. Each question's 4 rewritten options must remain mapped to the same 4 categories currently assigned (no re-shuffling which categories appear together in a question), to avoid re-deriving the seed's category-balance guarantees (12 offerings per category across 24 questions).

## Part 2: Curated growth resources

**Anti-fabrication design:** the AI never picks or names a resource. A static, code-owned map (`web/src/lib/coach-dna/resources.ts`, following the existing `categories.ts` pattern) assigns 1-2 verified real resources to each of the 8 categories. After the AI's response is parsed and zipped onto the TS-computed archetype slugs (the existing anti-fabrication pattern already used for pros/cons category slugs), code attaches the matching resource(s) for each `con.categorySlug` — a pure lookup, no AI involvement.

Researched and verified via Open Library's catalogue API and the RFL's own site (nothing invented):

| Category | Resource(s) |
|---|---|
| Teacher | *Teaching Games for Understanding* — Butler & Griffin, 2010 |
| Technician | RFL Coach Education hub (rugby-league.com/get-involved/coach) |
| Motivator | *The Coaching Habit* — Michael Bungay Stanier, 2016 |
| Developer | *Long-Term Athlete Development* — Balyi, Way & Higgs, 2013 |
| Game Manager | RFL Coach Education hub (tactical/game-strategy modules) |
| Communicator | *Coaching for Performance* — Sir John Whitmore, 1992 |
| Organiser | *Periodization Training for Sports* — Tudor Bompa, 1999 |
| Culture Builder | *Legacy* — James Kerr, 2013; *The Culture Code* — Daniel Coyle, 2018 |

Each entry: `{ title: string; description: string; url: string | null }`. Book entries link to their Open Library work page (stable, no dead-link risk); the RFL entries link to the live coach education hub.

## Part 3: Output shape & rendering

- `SelfAssessmentSummary.cons` entries gain a `resources: { title: string; description: string; url: string | null }[]` field. `pros` is unchanged (no resources, stays one sentence).
- `generateSelfAssessmentSummary`'s prompt changes: each focus area (`con`) becomes 2-3 sentences — what the gap looks like in practice, plus one concrete thing to try. Strengths (`pros`) stay one sentence, unchanged.
- Resources are attached after AI parsing, by the existing categorySlug lookup — never generated or selected by the AI.
- On-screen results, the PDF (`CoachDnaSummaryPDF.tsx`), and the email (`sendCoachDnaSummaryEmail`) all render the resource(s) under each focus area's expanded text, using the same amber/growth-area visual treatment each surface already has for cons.

## Out of scope

- The most/least forced-choice mechanic itself (ranking all 4 options was considered and explicitly rejected in favor of rewording — see design discussion).
- Any scoring formula change — `computeSelfOnlyCategoryScores` and `deriveArchetype` are untouched.
- Resources for strengths (`pros`) — only focus areas get resource pointers.
