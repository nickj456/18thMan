# Coach DNA — Self-Assessment Flow (Phase 3, sub-project 1)

## Purpose

The first user-facing slice of Coach DNA: a 24-question scenario-based self-assessment a coach
takes once, with save/resume, that never reveals which of the 8 categories an answer affects.
This is the entry point that lets a coach start building a Coach DNA profile before any Player
Voice or Peer Observation data exists.

Scoped narrowly per agreement: this sub-project ends at a plain completion screen. It does not
build the radar chart or dashboard — self-assessment alone can never produce a `scored` category
result (Phase 2's `computeCategoryScore` requires ≥2 active sources; self-only is always
`INSUFFICIENT_DATA`), so a results UI has nothing real to show until Player Voice or Peer
Observation exists. That's the next sub-project.

**Admin-gated for now.** Per explicit instruction, Coach DNA is visible only to `role = 'admin'`
users until reviewed and approved, using the same per-page auth-check pattern as
`admin/categories` (not a new middleware/proxy layer). Promotion to a full top-level nav section
for all coaches is a follow-up, out of scope here — it's a route relocation plus removing the
admin check, not a redesign.

## Existing architecture this builds on

- Next.js App Router, Server Components by default, Server Actions in co-located `actions.ts`.
- Admin-gate pattern (matches `web/src/app/(app)/admin/categories/page.tsx`): fetch the user,
  `redirect('/login')` if absent, fetch `profiles.role`, `redirect('/dashboard')` if not `'admin'`.
- Supabase server client (`createClient()`) for all reads/writes here — no service-role client
  needed, since RLS on `assessment_attempts`/`assessment_responses` already scopes to
  `coach_id = auth.uid()` (Phase 1).
- Dark charcoal/zinc, orange `#f97316` accent, Geist Sans — matches existing admin pages.

## Routes and components

```
web/src/app/(app)/admin/coach-dna/
  page.tsx                                  — landing: resume or start
  actions.ts                                — startAssessment()
  assessment/[attemptId]/
    page.tsx                                — current question (Server Component)
    actions.ts                              — answerQuestion(), goBack()
  assessment/[attemptId]/complete/
    page.tsx                                — completion confirmation
```

**Landing page** (`admin/coach-dna/page.tsx`): queries `assessment_attempts` for
`coach_id = auth.uid() AND assessment_type = 'self_assessment' AND completed_at IS NULL`. If
found, shows "Resume assessment" linking to the current unanswered question. If none, and no
*completed* attempt exists either, shows "Start assessment." If a completed attempt already
exists, shows "You've completed your self-assessment" with a note that retaking isn't supported
in this sub-project (no requirement for it yet — YAGNI).

**Question page** (`assessment/[attemptId]/page.tsx`): Server Component. Loads the attempt
(verifies `coach_id = auth.uid()`, 404/redirect otherwise), counts answered questions to
determine position (`answeredCount + 1` of 24), fetches the next unanswered
`assessment_questions` row (`assessment_type = 'self_assessment'`, `active = true`, ordered by a
fixed `question_order` — see Data section) and its `assessment_options`. **Only `id` and
`option_text` are selected for options — `category_weights_json` is never queried into this
Server Component's data at all**, so it cannot leak to the client by any means (not just hidden
in the UI). Renders a progress bar (`n / 24`), the scenario text, and the options as a radio-style
list. Simplified during planning: rather than adding a new `radio-group` primitive, each option
renders as its own `<form>` (bound Server Action) whose submit button is styled as a full-width
card — clicking an option submits and advances immediately, no separate "confirm" step. The
previously-selected option (if the coach navigated Back) gets a highlighted ring/border purely via
conditional styling; no radio input semantics are needed since selection = submission.

**Answering** (`actions.ts` → `answerQuestion(attemptId, questionId, selectedOptionId)`):
upserts `assessment_responses` on the `(attempt_id, question_id)` unique constraint, then
redirects to the next unanswered question (or to `.../complete` if that was question 24, setting
`assessment_attempts.completed_at = now()` in the same action).

**Navigation position**: the question page reads an optional `?q=<questionId>` search param. If
present and the question belongs to this attempt's ordered set, that question is shown (with its
existing answer preselected, if any) — this is how Back and direct links work, no dynamic route
segment needed. If absent, the page shows the next unanswered question (computed by the
`getQuestionProgress` helper below). **Back** is a plain link to the previous question's `?q=`
value, computed from the ordered list — no data mutation.

**Completion page**: static confirmation — "Assessment complete. Thanks for your honesty. Your
Coach DNA profile builds as player and peer feedback comes in." No score, no category breakdown,
per the agreed scope. Links back to `/admin/coach-dna`.

## Data

**Migration** (new, next sequential number after 107): seeds 24 rows into
`assessment_questions` (`assessment_type = 'self_assessment'`, `question_format =
'scenario_choice'`, `age_group = null`, `category_id = null` — self-assessment's category mapping
is per-option, not per-question, per the Phase 1 design resolution) plus 4 `assessment_options`
per question (96 rows total), each option's `category_weights_json` set to a single category at
weight 100 (e.g. `{"teacher": 100}`) — kept single-category rather than blended across categories
for this initial content set, since hiding the mapping is already fully achieved by never sending
weights to the client; blended weights can be introduced later by editing option rows without a
schema change.

**`question_order`**: `assessment_questions` has no explicit ordering column today. Add one
(`display_order integer`) in the same migration, since presenting 24 questions in a stable,
predictable order is required for "question N of 24" and resume-at-the-right-spot to work — a
coach resuming later must see the same sequence, which a `created_at`-only ordering is fragile
to preserve if content is ever edited via the (not-yet-built) admin question editor. Nullable,
defaulting per-row to the seed order; not required for `player_voice`/`peer_observation` questions
(those aren't sequenced the same way), so left nullable.

**Question content** — 24 scenarios, 4 options each, one option per category, rotating category
coverage in fixed groups of 4 per question so each of the 8 categories appears in exactly 12 of
the 96 total options. Content below is realistic placeholder — the plan will transcribe it
verbatim into the seed migration for you to review and edit at any time via direct SQL or a later
admin editor, without needing to touch application code.

| # | Scenario | Option A | Option B | Option C | Option D |
|---|----------|----------|----------|----------|----------|
| 1 | You're planning next week's session after a scrappy loss. | Break down exactly what went wrong technically and drill it until it's second nature. *(Teacher)* | Focus the session on a technical fix for the specific tackle-completion issue you spotted on video. *(Technician)* | Keep the session upbeat and focus on what the team did well, to rebuild confidence first. *(Motivator)* | Use the loss as a long-term development marker — note it and plan the skill over the next month, not this week. *(Developer)* |
| 2 | A near-final-whistle penalty decision goes against you and the team is fuming in the changing room. | Talk through the tactical options you had in that moment and what you'd call differently next time. *(Game Manager)* | Address the room calmly, acknowledge the frustration, and set the tone for how you talk about it publicly. *(Communicator)* | Make sure the changing room is packed up and the bus is on schedule despite the delay. *(Organiser)* | Use the moment to reinforce how the team supports each other regardless of results. *(Developer)* |
| 3 | A player keeps making the same positional error in defence. | Walk them through exactly why the error happens and what to look for next time. *(Teacher)* | Bring in a specific drill built to correct their footwork on that read. *(Game Manager)* | Pull them aside and explain clearly, in plain language, what you need from them. *(Communicator)* | Note it as a long-term project for them, not something to fix in one conversation. *(Developer)* |
| 4 | You've got a talented player who's disruptive at training. | Give them extra individual technical work to channel their energy. *(Technician)* | Have a one-on-one about what's driving the behaviour, not just the behaviour itself. *(Motivator)* | Set a clear, consistent structure for the session so there's less room for disruption. *(Organiser)* | Frame it as a team standards conversation, not just a talk with them. *(Culture Builder)* |
| 5 | Pre-season, you're setting goals for the year. | Set specific technical benchmarks the team should hit by mid-season. *(Teacher)* | Ask the group what they want out of the season and build the plan around that together. *(Communicator)* | Map out the training calendar and logistics for the whole block now. *(Organiser)* | Focus goal-setting on effort and enjoyment rather than results. *(Motivator)* |
| 6 | Weather turns bad mid-session and the ground is unplayable for your planned drills. | Switch to a technical skills session you can run in the clubhouse or a smaller dry area. *(Technician)* | Use the disruption to test how the team adapts tactically under changed conditions. *(Game Manager)* | Adjust the session plan on the fly without losing much time. *(Developer)* | Keep spirits high and turn it into a fun, lower-stakes session. *(Culture Builder)* |
| 7 | A quiet player never speaks up in team meetings. | Break your explanations down further to make sure they're following, even if they don't ask. *(Teacher)* | Give them specific technical feedback one-on-one instead of only in the group. *(Technician)* | Check in privately about how they're finding things and encourage them gently. *(Motivator)* | Note their development needs individually rather than expecting the group format to work for them. *(Developer)* |
| 8 | You've just won a close match against a much stronger side. | Talk through the tactical decisions that made the difference. *(Game Manager)* | Get the message out to players and parents about how well the team played. *(Communicator)* | Make sure the post-match logistics (transport, next fixture info) are sorted before anyone leaves. *(Organiser)* | Celebrate it as proof of what the team's culture can achieve. *(Culture Builder)* |
| 9 | A parent pulls you aside, unhappy their child isn't getting more game time. | Explain clearly and specifically what the player needs to work on to earn more minutes. *(Teacher)* | Point to the tactical reasoning behind your team selection that day. *(Game Manager)* | Listen fully, then explain your reasoning calmly and respectfully. *(Communicator)* | Reassure them the club values effort and involvement for every player, not just game time. *(Motivator)* |
| 10 | Training attendance has been dropping the last few weeks. | Bring in a more technically focused session to make attending feel more valuable. *(Technician)* | Talk to a few players individually about what would get them back and adjust the plan for them. *(Motivator)* | Review the training schedule — is the timing or format part of the problem? *(Organiser)* | Talk to the group about what training means to the team, not just to results. *(Culture Builder)* |
| 11 | A player picks up a minor injury mid-session. | Walk them through exactly what happened and how to avoid it next time. *(Teacher)* | Adjust their individual training plan around the injury for the coming weeks. *(Communicator)* | Make sure the session keeps running smoothly for everyone else while it's dealt with. *(Organiser)* | Check in on how they're feeling about it, not just the injury itself. *(Motivator)* |
| 12 | Two players clash during a drill and it nearly turns physical. | Bring in a specific technical drill next session that requires them to work together. *(Technician)* | Manage the moment tactically — separate them, reset the drill, keep control. *(Game Manager)* | Talk to both individually about what's really going on between them. *(Developer)* | Use it to reinforce what the team stands for and how conflict gets handled. *(Culture Builder)* |
| 13 | You're introducing a brand new skill the team has never drilled before. | Break it down into small, teachable steps before trying it at pace. *(Teacher)* | Bring in the tactical context for when and why the skill matters in a game. *(Game Manager)* | Explain clearly why you're introducing it now and what you expect from it. *(Communicator)* | Treat it as a multi-week development project, not a one-session fix. *(Developer)* |
| 14 | A player asks for extra one-on-one help outside normal training. | Focus the extra session on a specific technical weakness you've both identified. *(Technician)* | Use it to figure out what's really motivating them to put in the extra work. *(Motivator)* | Fit it into the training calendar without disrupting anything else. *(Organiser)* | Frame it as part of their long-term development plan. *(Developer)* |
| 15 | It's the end of the season and you're reflecting with the group. | Talk through what worked and didn't work about the tactical approach this year. *(Game Manager)* | Ask the group directly what they'd want to change next year. *(Communicator)* | Make sure the end-of-season logistics (presentations, sign-off) are handled well. *(Organiser)* | Focus the conversation on what the team built together this year. *(Motivator)* |
| 16 | A new player joins mid-season and doesn't know anyone. | Give them clear, direct technical coaching so they're not left behind. *(Teacher)* | Pair them with a specific tactical role suited to their strengths right away. *(Technician)* | Have someone check in on how they're settling in, not just how they're playing. *(Developer)* | Make an effort to fold them into the team's existing culture and habits. *(Culture Builder)* |
| 17 | The team is flat and demoralised after a heavy loss. | Break down specifically what went wrong so they understand it, not just feel bad about it. *(Teacher)* | Talk to them about why it matters and reconnect them to why they play. *(Motivator)* | Address the group directly and honestly about where things stand. *(Communicator)* | Remind them what the team is about beyond just results. *(Culture Builder)* |
| 18 | Several players are visibly fatigued a few weeks into a heavy fixture run. | Adjust the technical intensity of sessions to manage load. *(Technician)* | Make tactical changes to protect tired players in games. *(Game Manager)* | Restructure the training schedule to build in recovery. *(Organiser)* | Check in on how the group's coping, not just their bodies. *(Motivator)* |
| 19 | You're planning for a finals campaign. | Set out the technical standards the team needs to hit to compete at that level. *(Teacher)* | Build the tactical game plan specifically for the sides you'll likely face. *(Technician)* | Get very deliberate about logistics — travel, prep, timing — for the bigger occasion. *(Organiser)* | Focus on keeping the team grounded and connected under the extra pressure. *(Developer)* |
| 20 | A parent is shouting instructions from the sideline during a game. | Have a clear, calm conversation with them about it after the game. *(Communicator)* | Use it as a moment to reinforce the team's standards around sideline behaviour. *(Culture Builder)* | Stay focused on your own tactical calls and address it separately later. *(Game Manager)* | Note it as something to manage proactively before the next game. *(Organiser)* |
| 21 | You want to delegate more to your assistant coaches this season. | Make sure they're clear on the technical content you want delivered. *(Teacher)* | Have a direct conversation about roles and expectations. *(Communicator)* | Set up a clear structure for who runs what each week. *(Organiser)* | Involve them in shaping the team's culture, not just running drills. *(Culture Builder)* |
| 22 | A talented player isn't trying hard in training. | Give them more technically demanding work to re-engage them. *(Technician)* | Have a conversation about what's behind the lack of effort. *(Motivator)* | Think about what this means for their development long-term, not just this week. *(Developer)* | Reinforce what effort means to the team, regardless of talent. *(Culture Builder)* |
| 23 | You need to close out a tight game in the final minutes. | Make the tactical calls needed to see the game out. *(Game Manager)* | Get the message to players clearly and calmly amid the noise. *(Communicator)* | Trust the technical habits you've drilled all season to hold up. *(Teacher)* | Lean on the team's composure and trust in each other. *(Culture Builder)* |
| 24 | Looking back on the whole season, what mattered most to you? | Seeing individual players' skills improve technically. *(Technician)* | Seeing the team make smarter decisions on the field. *(Game Manager)* | Seeing players grow and develop as people, not just players. *(Developer)* | Seeing the team become a place players wanted to be. *(Culture Builder)* |

*(Category tags in italics are stored in `category_weights_json` server-side only — never shown
in the UI. The tag maps to the `dna_categories.slug` seeded in Phase 1: Teacher→`teacher`,
Technician→`technician`, Motivator→`motivator`, Developer→`developer`, Game Manager→`game-manager`,
Communicator→`communicator`, Organiser→`organiser`, Culture Builder→`culture-builder`. Each
option's `category_weights_json` is therefore a single-key object, e.g. `{"game-manager": 100}`.)*

## Testing

Per `TESTING.md` convention, this sub-project's logic worth unit-testing is thin (mostly Server
Components/Actions, which this codebase doesn't unit-test directly — matches existing route
patterns like `admin/categories`). The one pure-logic piece — determining the next unanswered
question and current position from a list of questions and responses — is extracted into a small
testable helper rather than left inline, so it gets a `*.test.ts` file per project convention.

## Brand and tone

Matches existing admin page style: dark zinc, orange accent, Geist Sans. Progress bar and
question cards use the existing `Card` primitive. Scenario and option copy avoids em dashes and
never frames an option as "correct" — all four options per question are legitimate coaching
styles, not right/wrong choices.
