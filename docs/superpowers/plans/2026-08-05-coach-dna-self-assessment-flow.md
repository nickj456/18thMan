# Coach DNA — Self-Assessment Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first user-facing slice of Coach DNA: an admin-gated, 24-question scenario-based self-assessment wizard with save/resume, ending in a plain completion screen. No score, no radar chart, no navigation change outside `/admin` — those are later sub-projects.

**Architecture:** Routes under `web/src/app/(app)/admin/coach-dna/`, matching the existing `admin/categories` per-page auth-gate pattern exactly. Server Components read directly via the Supabase server client; mutations are Server Actions in co-located `actions.ts` files. One pure helper (`getQuestionProgress`) is extracted and unit-tested per project TDD convention; everything else is route/action code following existing admin-route conventions (this codebase doesn't unit-test Server Components/Actions directly — see `admin/categories`).

**Tech Stack:** Next.js App Router, Supabase server client, existing shadcn/ui `Card`/`Button` primitives. One new migration seeding 24 questions + 96 options via the Supabase MCP tools, same as prior phases.

## Global Constraints

- Coach DNA is visible only to `role = 'admin'` users for now — every page in this route tree does the same `redirect('/login')` / `redirect('/dashboard')` check used by `web/src/app/(app)/admin/categories/page.tsx`. Do not add a nav entry anywhere outside the admin panel yet.
- `assessment_options.category_weights_json` is NEVER selected into a Server Component that renders to the client — only `id` and `option_text` are queried for options. This is a stronger guarantee than "don't render it": the data must not enter the component's props at all.
- No em dashes in any UI copy (project brand rule) — the question/option text below has already been checked and is clean; do not introduce new copy with em dashes.
- No `any` types. Follow the existing `web/src/lib/supabase/types.ts` hand-maintained interface style for the one type addition (`display_order` on `AssessmentQuestion`).
- Self-assessment alone never produces a score — do not build any results/radar UI in this plan. The completion screen is static copy, no computation.
- Use the Supabase MCP tools (`apply_migration`, `execute_sql`) to apply and verify the migration — no local Supabase CLI in this project.

---

### Task 1: Migration — `display_order` column + seed 24 questions and 96 options

**Files:**
- Create: `web/supabase/migrations/108_self_assessment_seed.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `AssessmentQuestion.display_order: number | null` (extends the existing Phase 1/2 interface).

- [ ] **Step 1: Write the migration**

```sql
-- 108_self_assessment_seed.sql
alter table public.assessment_questions
  add column display_order integer;

create index assessment_questions_display_order_idx
  on public.assessment_questions(display_order)
  where assessment_type = 'self_assessment';

insert into public.assessment_questions (id, assessment_type, question_text, question_format, active, version, display_order) values
  ('a0000000-0000-0000-0000-000000000001', 'self_assessment', 'You''re planning next week''s session after a scrappy loss.', 'scenario_choice', true, 1, 1),
  ('a0000000-0000-0000-0000-000000000002', 'self_assessment', 'A near-final-whistle penalty decision goes against you and the team is fuming in the changing room.', 'scenario_choice', true, 1, 2),
  ('a0000000-0000-0000-0000-000000000003', 'self_assessment', 'A player keeps making the same positional error in defence.', 'scenario_choice', true, 1, 3),
  ('a0000000-0000-0000-0000-000000000004', 'self_assessment', 'You''ve got a talented player who''s disruptive at training.', 'scenario_choice', true, 1, 4),
  ('a0000000-0000-0000-0000-000000000005', 'self_assessment', 'Pre-season, you''re setting goals for the year.', 'scenario_choice', true, 1, 5),
  ('a0000000-0000-0000-0000-000000000006', 'self_assessment', 'Weather turns bad mid-session and the ground is unplayable for your planned drills.', 'scenario_choice', true, 1, 6),
  ('a0000000-0000-0000-0000-000000000007', 'self_assessment', 'A quiet player never speaks up in team meetings.', 'scenario_choice', true, 1, 7),
  ('a0000000-0000-0000-0000-000000000008', 'self_assessment', 'You''ve just won a close match against a much stronger side.', 'scenario_choice', true, 1, 8),
  ('a0000000-0000-0000-0000-000000000009', 'self_assessment', 'A parent pulls you aside, unhappy their child isn''t getting more game time.', 'scenario_choice', true, 1, 9),
  ('a0000000-0000-0000-0000-000000000010', 'self_assessment', 'Training attendance has been dropping the last few weeks.', 'scenario_choice', true, 1, 10),
  ('a0000000-0000-0000-0000-000000000011', 'self_assessment', 'A player picks up a minor injury mid-session.', 'scenario_choice', true, 1, 11),
  ('a0000000-0000-0000-0000-000000000012', 'self_assessment', 'Two players clash during a drill and it nearly turns physical.', 'scenario_choice', true, 1, 12),
  ('a0000000-0000-0000-0000-000000000013', 'self_assessment', 'You''re introducing a brand new skill the team has never drilled before.', 'scenario_choice', true, 1, 13),
  ('a0000000-0000-0000-0000-000000000014', 'self_assessment', 'A player asks for extra one-on-one help outside normal training.', 'scenario_choice', true, 1, 14),
  ('a0000000-0000-0000-0000-000000000015', 'self_assessment', 'It''s the end of the season and you''re reflecting with the group.', 'scenario_choice', true, 1, 15),
  ('a0000000-0000-0000-0000-000000000016', 'self_assessment', 'A new player joins mid-season and doesn''t know anyone.', 'scenario_choice', true, 1, 16),
  ('a0000000-0000-0000-0000-000000000017', 'self_assessment', 'The team is flat and demoralised after a heavy loss.', 'scenario_choice', true, 1, 17),
  ('a0000000-0000-0000-0000-000000000018', 'self_assessment', 'Several players are visibly fatigued a few weeks into a heavy fixture run.', 'scenario_choice', true, 1, 18),
  ('a0000000-0000-0000-0000-000000000019', 'self_assessment', 'You''re planning for a finals campaign.', 'scenario_choice', true, 1, 19),
  ('a0000000-0000-0000-0000-000000000020', 'self_assessment', 'A parent is shouting instructions from the sideline during a game.', 'scenario_choice', true, 1, 20),
  ('a0000000-0000-0000-0000-000000000021', 'self_assessment', 'You want to delegate more to your assistant coaches this season.', 'scenario_choice', true, 1, 21),
  ('a0000000-0000-0000-0000-000000000022', 'self_assessment', 'A talented player isn''t trying hard in training.', 'scenario_choice', true, 1, 22),
  ('a0000000-0000-0000-0000-000000000023', 'self_assessment', 'You need to close out a tight game in the final minutes.', 'scenario_choice', true, 1, 23),
  ('a0000000-0000-0000-0000-000000000024', 'self_assessment', 'Looking back on the whole season, what mattered most to you?', 'scenario_choice', true, 1, 24);

insert into public.assessment_options (id, question_id, option_text, category_weights_json) values
  -- Q1
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Break down exactly what went wrong technically and drill it until it''s second nature.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Focus the session on a technical fix for the specific tackle-completion issue you spotted on video.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Keep the session upbeat and focus on what the team did well, to rebuild confidence first.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Use the loss as a long-term development marker, and plan the skill over the next month rather than this week.', '{"developer": 100}'),
  -- Q2
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Talk through the tactical options you had in that moment and what you''d call differently next time.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Address the room calmly, acknowledge the frustration, and set the tone for how you talk about it publicly.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Make sure the changing room is packed up and the bus is on schedule despite the delay.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Use the moment to reinforce how the team supports each other regardless of results.', '{"developer": 100}'),
  -- Q3
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Walk them through exactly why the error happens and what to look for next time.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'Bring in a specific drill built to correct their footwork on that read.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'Pull them aside and explain clearly, in plain language, what you need from them.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'Note it as a long-term project for them, not something to fix in one conversation.', '{"developer": 100}'),
  -- Q4
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004', 'Give them extra individual technical work to channel their energy.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 'Have a one-on-one about what''s driving the behaviour, not just the behaviour itself.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000004', 'Set a clear, consistent structure for the session so there''s less room for disruption.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000004', 'Frame it as a team standards conversation, not just a talk with them.', '{"culture-builder": 100}'),
  -- Q5
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000005', 'Set specific technical benchmarks the team should hit by mid-season.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000005', 'Ask the group what they want out of the season and build the plan around that together.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000005', 'Map out the training calendar and logistics for the whole block now.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000005', 'Focus goal-setting on effort and enjoyment rather than results.', '{"motivator": 100}'),
  -- Q6
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000006', 'Switch to a technical skills session you can run in the clubhouse or a smaller dry area.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000006', 'Use the disruption to test how the team adapts tactically under changed conditions.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000006', 'Adjust the session plan on the fly without losing much time.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000006', 'Keep spirits high and turn it into a fun, lower-stakes session.', '{"culture-builder": 100}'),
  -- Q7
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000007', 'Break your explanations down further to make sure they''re following, even if they don''t ask.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000007', 'Give them specific technical feedback one-on-one instead of only in the group.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000007', 'Check in privately about how they''re finding things and encourage them gently.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000007', 'Note their development needs individually rather than expecting the group format to work for them.', '{"developer": 100}'),
  -- Q8
  ('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000008', 'Talk through the tactical decisions that made the difference.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000008', 'Get the message out to players and parents about how well the team played.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000008', 'Make sure the post-match logistics (transport, next fixture info) are sorted before anyone leaves.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000008', 'Celebrate it as proof of what the team''s culture can achieve.', '{"culture-builder": 100}'),
  -- Q9
  ('b0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000009', 'Explain clearly and specifically what the player needs to work on to earn more minutes.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000009', 'Point to the tactical reasoning behind your team selection that day.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000009', 'Listen fully, then explain your reasoning calmly and respectfully.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000036', 'a0000000-0000-0000-0000-000000000009', 'Reassure them the club values effort and involvement for every player, not just game time.', '{"motivator": 100}'),
  -- Q10
  ('b0000000-0000-0000-0000-000000000037', 'a0000000-0000-0000-0000-000000000010', 'Bring in a more technically focused session to make attending feel more valuable.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000038', 'a0000000-0000-0000-0000-000000000010', 'Talk to a few players individually about what would get them back and adjust the plan for them.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000039', 'a0000000-0000-0000-0000-000000000010', 'Review the training schedule to see whether timing or format is part of the problem.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000010', 'Talk to the group about what training means to the team, not just to results.', '{"culture-builder": 100}'),
  -- Q11
  ('b0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000011', 'Walk them through exactly what happened and how to avoid it next time.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000011', 'Adjust their individual training plan around the injury for the coming weeks.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000011', 'Make sure the session keeps running smoothly for everyone else while it''s dealt with.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000011', 'Check in on how they''re feeling about it, not just the injury itself.', '{"motivator": 100}'),
  -- Q12
  ('b0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000012', 'Bring in a specific technical drill next session that requires them to work together.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000012', 'Manage the moment tactically: separate them, reset the drill, keep control.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000012', 'Talk to both individually about what''s really going on between them.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000012', 'Use it to reinforce what the team stands for and how conflict gets handled.', '{"culture-builder": 100}'),
  -- Q13
  ('b0000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000013', 'Break it down into small, teachable steps before trying it at pace.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000050', 'a0000000-0000-0000-0000-000000000013', 'Bring in the tactical context for when and why the skill matters in a game.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-000000000013', 'Explain clearly why you''re introducing it now and what you expect from it.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000052', 'a0000000-0000-0000-0000-000000000013', 'Treat it as a multi-week development project, not a one-session fix.', '{"developer": 100}'),
  -- Q14
  ('b0000000-0000-0000-0000-000000000053', 'a0000000-0000-0000-0000-000000000014', 'Focus the extra session on a specific technical weakness you''ve both identified.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000054', 'a0000000-0000-0000-0000-000000000014', 'Use it to figure out what''s really motivating them to put in the extra work.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000055', 'a0000000-0000-0000-0000-000000000014', 'Fit it into the training calendar without disrupting anything else.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000056', 'a0000000-0000-0000-0000-000000000014', 'Frame it as part of their long-term development plan.', '{"developer": 100}'),
  -- Q15
  ('b0000000-0000-0000-0000-000000000057', 'a0000000-0000-0000-0000-000000000015', 'Talk through what worked and didn''t work about the tactical approach this year.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000058', 'a0000000-0000-0000-0000-000000000015', 'Ask the group directly what they''d want to change next year.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000059', 'a0000000-0000-0000-0000-000000000015', 'Make sure the end-of-season logistics (presentations, sign-off) are handled well.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000060', 'a0000000-0000-0000-0000-000000000015', 'Focus the conversation on what the team built together this year.', '{"motivator": 100}'),
  -- Q16
  ('b0000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-000000000016', 'Give them clear, direct technical coaching so they''re not left behind.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000062', 'a0000000-0000-0000-0000-000000000016', 'Pair them with a specific tactical role suited to their strengths right away.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000063', 'a0000000-0000-0000-0000-000000000016', 'Have someone check in on how they''re settling in, not just how they''re playing.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000064', 'a0000000-0000-0000-0000-000000000016', 'Make an effort to fold them into the team''s existing culture and habits.', '{"culture-builder": 100}'),
  -- Q17
  ('b0000000-0000-0000-0000-000000000065', 'a0000000-0000-0000-0000-000000000017', 'Break down specifically what went wrong so they understand it, not just feel bad about it.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000066', 'a0000000-0000-0000-0000-000000000017', 'Talk to them about why it matters and reconnect them to why they play.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000067', 'a0000000-0000-0000-0000-000000000017', 'Address the group directly and honestly about where things stand.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000068', 'a0000000-0000-0000-0000-000000000017', 'Remind them what the team is about beyond just results.', '{"culture-builder": 100}'),
  -- Q18
  ('b0000000-0000-0000-0000-000000000069', 'a0000000-0000-0000-0000-000000000018', 'Adjust the technical intensity of sessions to manage load.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000070', 'a0000000-0000-0000-0000-000000000018', 'Make tactical changes to protect tired players in games.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000071', 'a0000000-0000-0000-0000-000000000018', 'Restructure the training schedule to build in recovery.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000072', 'a0000000-0000-0000-0000-000000000018', 'Check in on how the group''s coping, not just their bodies.', '{"motivator": 100}'),
  -- Q19
  ('b0000000-0000-0000-0000-000000000073', 'a0000000-0000-0000-0000-000000000019', 'Set out the technical standards the team needs to hit to compete at that level.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000074', 'a0000000-0000-0000-0000-000000000019', 'Build the tactical game plan specifically for the sides you''ll likely face.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000075', 'a0000000-0000-0000-0000-000000000019', 'Get very deliberate about logistics like travel, prep, and timing for the bigger occasion.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000076', 'a0000000-0000-0000-0000-000000000019', 'Focus on keeping the team grounded and connected under the extra pressure.', '{"developer": 100}'),
  -- Q20
  ('b0000000-0000-0000-0000-000000000077', 'a0000000-0000-0000-0000-000000000020', 'Have a clear, calm conversation with them about it after the game.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000078', 'a0000000-0000-0000-0000-000000000020', 'Use it as a moment to reinforce the team''s standards around sideline behaviour.', '{"culture-builder": 100}'),
  ('b0000000-0000-0000-0000-000000000079', 'a0000000-0000-0000-0000-000000000020', 'Stay focused on your own tactical calls and address it separately later.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000080', 'a0000000-0000-0000-0000-000000000020', 'Note it as something to manage proactively before the next game.', '{"organiser": 100}'),
  -- Q21
  ('b0000000-0000-0000-0000-000000000081', 'a0000000-0000-0000-0000-000000000021', 'Make sure they''re clear on the technical content you want delivered.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000082', 'a0000000-0000-0000-0000-000000000021', 'Have a direct conversation about roles and expectations.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000083', 'a0000000-0000-0000-0000-000000000021', 'Set up a clear structure for who runs what each week.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000084', 'a0000000-0000-0000-0000-000000000021', 'Involve them in shaping the team''s culture, not just running drills.', '{"culture-builder": 100}'),
  -- Q22
  ('b0000000-0000-0000-0000-000000000085', 'a0000000-0000-0000-0000-000000000022', 'Give them more technically demanding work to re-engage them.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000086', 'a0000000-0000-0000-0000-000000000022', 'Have a conversation about what''s behind the lack of effort.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000087', 'a0000000-0000-0000-0000-000000000022', 'Think about what this means for their development long-term, not just this week.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000088', 'a0000000-0000-0000-0000-000000000022', 'Reinforce what effort means to the team, regardless of talent.', '{"culture-builder": 100}'),
  -- Q23
  ('b0000000-0000-0000-0000-000000000089', 'a0000000-0000-0000-0000-000000000023', 'Make the tactical calls needed to see the game out.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000090', 'a0000000-0000-0000-0000-000000000023', 'Get the message to players clearly and calmly amid the noise.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000091', 'a0000000-0000-0000-0000-000000000023', 'Trust the technical habits you''ve drilled all season to hold up.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000092', 'a0000000-0000-0000-0000-000000000023', 'Lean on the team''s composure and trust in each other.', '{"culture-builder": 100}'),
  -- Q24
  ('b0000000-0000-0000-0000-000000000093', 'a0000000-0000-0000-0000-000000000024', 'Seeing individual players'' skills improve technically.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000094', 'a0000000-0000-0000-0000-000000000024', 'Seeing the team make smarter decisions on the field.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000095', 'a0000000-0000-0000-0000-000000000024', 'Seeing players grow and develop as people, not just players.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000096', 'a0000000-0000-0000-0000-000000000024', 'Seeing the team become a place players wanted to be.', '{"culture-builder": 100}');
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "self_assessment_seed"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
select count(*) as question_count from public.assessment_questions
  where assessment_type = 'self_assessment' and display_order is not null;
select count(*) as option_count from public.assessment_options ao
  join public.assessment_questions aq on aq.id = ao.question_id
  where aq.assessment_type = 'self_assessment';
select display_order, count(*) from public.assessment_questions
  where assessment_type = 'self_assessment' group by display_order having count(*) > 1;
```
Expected: `question_count = 24`, `option_count = 96`, and the third query returns **zero rows** (confirms no duplicate `display_order` values — each of the 24 questions has a unique position).

Also verify category balance:
```sql
select ao.category_weights_json::text as category, count(*) from public.assessment_options ao
  join public.assessment_questions aq on aq.id = ao.question_id
  where aq.assessment_type = 'self_assessment'
  group by ao.category_weights_json::text order by 1;
```
Expected: exactly 8 rows, each with `count = 12` (one row per category, matching `{"teacher": 100}`, `{"technician": 100}`, `{"motivator": 100}`, `{"developer": 100}`, `{"game-manager": 100}`, `{"communicator": 100}`, `{"organiser": 100}`, `{"culture-builder": 100}`).

- [ ] **Step 4: Add the TypeScript type**

In `web/src/lib/supabase/types.ts`, find the `AssessmentQuestion` interface and add the new field:

```ts
export interface AssessmentQuestion {
  id: string
  assessment_type: AssessmentType
  question_text: string
  question_format: string
  age_group: string | null
  category_id: string | null
  display_order: number | null
  active: boolean
  version: number
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/108_self_assessment_seed.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): seed 24-question self-assessment content"
```

---

### Task 2: `getQuestionProgress` pure helper

**Files:**
- Create: `web/src/lib/coach-dna/assessment-progress.ts`
- Test: `web/src/lib/coach-dna/assessment-progress.test.ts`

**Interfaces:**
- Produces: `OrderedQuestion { id: string }`, `QuestionProgress { nextQuestion: OrderedQuestion | null; position: number; total: number; isComplete: boolean }`, `getQuestionProgress(orderedQuestions: OrderedQuestion[], answeredQuestionIds: string[]): QuestionProgress`, `getPreviousQuestionId(orderedQuestions: OrderedQuestion[], currentQuestionId: string): string | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/assessment-progress.test.ts
import { describe, it, expect } from 'vitest'
import { getQuestionProgress, getPreviousQuestionId, type OrderedQuestion } from './assessment-progress'

const questions: OrderedQuestion[] = [
  { id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' },
]

describe('getQuestionProgress', () => {
  it('returns the first question and position 1 when nothing is answered', () => {
    const result = getQuestionProgress(questions, [])
    expect(result).toEqual({ nextQuestion: { id: 'q1' }, position: 1, total: 4, isComplete: false })
  })

  it('returns the next unanswered question after some are answered, regardless of answer order', () => {
    const result = getQuestionProgress(questions, ['q2', 'q1'])
    expect(result).toEqual({ nextQuestion: { id: 'q3' }, position: 3, total: 4, isComplete: false })
  })

  it('marks the assessment complete when every question is answered', () => {
    const result = getQuestionProgress(questions, ['q1', 'q2', 'q3', 'q4'])
    expect(result).toEqual({ nextQuestion: null, position: 5, total: 4, isComplete: true })
  })

  it('ignores answered-question ids that are not in the ordered list', () => {
    const result = getQuestionProgress(questions, ['q1', 'stale-id-from-a-retired-question'])
    expect(result.nextQuestion).toEqual({ id: 'q2' })
  })

  it('returns complete for an empty question list', () => {
    const result = getQuestionProgress([], [])
    expect(result).toEqual({ nextQuestion: null, position: 1, total: 0, isComplete: true })
  })
})

describe('getPreviousQuestionId', () => {
  it('returns the id of the question before the current one', () => {
    expect(getPreviousQuestionId(questions, 'q3')).toBe('q2')
  })

  it('returns null when the current question is first in the list', () => {
    expect(getPreviousQuestionId(questions, 'q1')).toBeNull()
  })

  it('returns null when the current question id is not found', () => {
    expect(getPreviousQuestionId(questions, 'not-in-list')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/assessment-progress.test.ts`
Expected: FAIL — `Cannot find module './assessment-progress'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/assessment-progress.ts

export interface OrderedQuestion {
  id: string
}

export interface QuestionProgress {
  nextQuestion: OrderedQuestion | null
  position: number
  total: number
  isComplete: boolean
}

export function getQuestionProgress(
  orderedQuestions: OrderedQuestion[],
  answeredQuestionIds: string[],
): QuestionProgress {
  const answered = new Set(answeredQuestionIds)
  const total = orderedQuestions.length
  const nextQuestion = orderedQuestions.find(q => !answered.has(q.id)) ?? null
  const position = nextQuestion ? orderedQuestions.indexOf(nextQuestion) + 1 : total + 1
  return { nextQuestion, position, total, isComplete: nextQuestion === null }
}

export function getPreviousQuestionId(
  orderedQuestions: OrderedQuestion[],
  currentQuestionId: string,
): string | null {
  const idx = orderedQuestions.findIndex(q => q.id === currentQuestionId)
  if (idx <= 0) return null
  return orderedQuestions[idx - 1].id
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/assessment-progress.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/assessment-progress.ts web/src/lib/coach-dna/assessment-progress.test.ts
git commit -m "feat(coach-dna): add pure helper for assessment question progress and back-navigation"
```

---

### Task 3: Landing page + `startAssessment` action

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/actions.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (Task 2's helper is used starting Task 4).
- Produces: `startAssessment()` Server Action, used by Task 3/4's pages.

- [ ] **Step 1: Write `actions.ts`**

```ts
// web/src/app/(app)/admin/coach-dna/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, userId: user.id }
}

export async function startAssessment() {
  const { supabase, userId } = await requireAdmin()

  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({ coach_id: userId, assessment_type: 'self_assessment', version: 1 })
    .select('id')
    .single()

  if (error || !attempt) throw new Error(error?.message ?? 'Failed to start assessment')

  redirect(`/admin/coach-dna/assessment/${attempt.id}`)
}
```

- [ ] **Step 2: Write `page.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { startAssessment } from './actions'

export const metadata = { title: 'Coach DNA — Admin' }

export default async function CoachDnaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: inProgress } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('coach_id', user.id)
    .eq('assessment_type', 'self_assessment')
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: completed } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('coach_id', user.id)
    .eq('assessment_type', 'self_assessment')
    .not('completed_at', 'is', null)
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="app-heading text-2xl">Coach DNA</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Self-assessment (admin preview)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coach self-assessment</CardTitle>
          <CardDescription>
            24 scenario-based questions about how you coach. Takes about 10 minutes. You can save
            and come back at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completed ? (
            <p className="text-sm text-zinc-400">
              You&apos;ve completed your self-assessment. Retaking it isn&apos;t supported yet.
            </p>
          ) : inProgress ? (
            <form action={async () => {
              'use server'
              redirect(`/admin/coach-dna/assessment/${inProgress.id}`)
            }}>
              <Button type="submit">Resume assessment</Button>
            </form>
          ) : (
            <form action={startAssessment}>
              <Button type="submit">Start assessment</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(app\)/admin/coach-dna/page.tsx web/src/app/\(app\)/admin/coach-dna/actions.ts
git commit -m "feat(coach-dna): add self-assessment landing page with resume/start"
```

---

### Task 4: Question page + `answerQuestion`/option-card component

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts`
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx`

**Interfaces:**
- Consumes: `getQuestionProgress`, `getPreviousQuestionId`, `OrderedQuestion` from Task 2 (`@/lib/coach-dna/assessment-progress`).
- Produces: `answerQuestion(attemptId: string, questionId: string, selectedOptionId: string)` Server Action.

- [ ] **Step 1: Write `actions.ts`**

```ts
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress } from '@/lib/coach-dna/assessment-progress'

async function requireOwnAttempt(attemptId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  return { supabase, userId: user.id }
}

export async function answerQuestion(attemptId: string, questionId: string, selectedOptionId: string) {
  const { supabase } = await requireOwnAttempt(attemptId)

  const { error: upsertError } = await supabase
    .from('assessment_responses')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option: selectedOptionId },
      { onConflict: 'attempt_id,question_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  const { data: orderedQuestions } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id')
    .eq('attempt_id', attemptId)

  const progress = getQuestionProgress(orderedQuestions ?? [], (responses ?? []).map(r => r.question_id))

  if (progress.isComplete) {
    const { error: completeError } = await supabase
      .from('assessment_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId)
    if (completeError) throw new Error(completeError.message)
    redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)
  }

  redirect(`/admin/coach-dna/assessment/${attemptId}?q=${progress.nextQuestion!.id}`)
}
```

- [ ] **Step 2: Write `OptionCard.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx
import { Card } from '@/components/ui/card'
import { answerQuestion } from './actions'

export function OptionCard({
  attemptId,
  questionId,
  optionId,
  optionText,
  isSelected,
}: {
  attemptId: string
  questionId: string
  optionId: string
  optionText: string
  isSelected: boolean
}) {
  const submit = answerQuestion.bind(null, attemptId, questionId, optionId)

  return (
    <form action={submit}>
      <button type="submit" className="w-full text-left">
        <Card
          className={`p-4 transition-colors hover:bg-zinc-800/60 cursor-pointer ${
            isSelected ? 'ring-2 ring-[#f97316] bg-zinc-800/40' : ''
          }`}
        >
          <p className="text-sm text-zinc-200">{optionText}</p>
        </Card>
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Write `page.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress, getPreviousQuestionId } from '@/lib/coach-dna/assessment-progress'
import { OptionCard } from './OptionCard'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Coach DNA — Self-Assessment' }

export default async function AssessmentQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { attemptId } = await params
  const { q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (attempt.completed_at) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const { data: orderedQuestions } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })
  const questions = orderedQuestions ?? []

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option')
    .eq('attempt_id', attemptId)
  const answeredIds = (responses ?? []).map(r => r.question_id)

  const progress = getQuestionProgress(questions, answeredIds)
  const currentQuestionId = q && questions.some(quest => quest.id === q) ? q : progress.nextQuestion?.id

  if (!currentQuestionId) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const position = questions.findIndex(quest => quest.id === currentQuestionId) + 1
  const previousQuestionId = getPreviousQuestionId(questions, currentQuestionId)
  const existingResponse = (responses ?? []).find(r => r.question_id === currentQuestionId)

  const { data: question } = await supabase
    .from('assessment_questions')
    .select('id, question_text')
    .eq('id', currentQuestionId)
    .single()

  // Only id and option_text are selected here — category_weights_json never enters this component.
  const { data: options } = await supabase
    .from('assessment_options')
    .select('id, option_text')
    .eq('question_id', currentQuestionId)

  if (!question) redirect('/admin/coach-dna')

  return (
    <div className="space-y-6 max-w-2xl">
      {previousQuestionId ? (
        <Link
          href={`/admin/coach-dna/assessment/${attemptId}?q=${previousQuestionId}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </Link>
      ) : (
        <Link
          href="/admin/coach-dna"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Exit
        </Link>
      )}

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Question {position} of {questions.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#f97316] transition-all"
            style={{ width: `${(position / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="app-heading text-xl">{question.question_text}</h1>

      <div className="space-y-3">
        {(options ?? []).map(option => (
          <OptionCard
            key={option.id}
            attemptId={attemptId}
            questionId={currentQuestionId}
            optionId={option.id}
            optionText={option.option_text}
            isSelected={existingResponse?.selected_option === option.id}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/"
git commit -m "feat(coach-dna): add self-assessment question wizard with save/resume"
```

---

### Task 5: Completion page + admin panel nav entry

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Modify: `web/src/app/(app)/admin/page.tsx`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Write the completion page**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export const metadata = { title: 'Coach DNA — Assessment Complete' }

export default async function AssessmentCompletePage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) redirect('/admin/coach-dna')

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <CardTitle>Assessment complete</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Thanks for your honesty. Your Coach DNA profile builds as player and peer feedback
            comes in.
          </p>
          <Button render={<Link href="/admin/coach-dna" />}>Back to Coach DNA</Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add the admin panel nav entry**

In `web/src/app/(app)/admin/page.tsx`, add `Brain` (or similar) to the `lucide-react` import list, and add a new entry to the `panels` array (matching the existing entries' shape exactly):

```ts
{
  href: '/admin/coach-dna',
  icon: Brain,
  label: 'Coach DNA',
  description: 'Self-assessment preview (admin only)',
  colour: 'border-orange-500/20 hover:border-orange-500/40 text-orange-400',
},
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" "web/src/app/(app)/admin/page.tsx"
git commit -m "feat(coach-dna): add assessment completion screen and admin panel entry"
```

---

### Task 6: Full verification

**Files:**
- None created — this task verifies Tasks 1-5 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus the new `assessment-progress.test.ts` pass, no regressions.

- [ ] **Step 2: Confirm the RLS/data-exposure guarantee**

Run: `cd web && grep -rn "category_weights_json" "src/app/(app)/admin/coach-dna/"`
Expected: no output (empty) — confirms no Server Component or Server Action in this route tree ever selects `category_weights_json`, so it cannot reach the client under any code path.

- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This task involves real UI (a multi-step wizard with save/resume) that needs to be clicked through as a logged-in admin user to confirm it actually works end-to-end — typecheck and the one pure-logic test do not verify that. Do NOT claim this flow "works" without doing this. If you have Playwright MCP tools and valid admin credentials available in this environment, use them to:
1. Log in as an admin user.
2. Navigate to `/admin/coach-dna`, click "Start assessment."
3. Answer 2-3 questions, confirm the progress bar advances and the URL's `?q=` param changes.
4. Click "Back," confirm the previous answer is highlighted.
5. Navigate away (e.g. to `/admin`) and back to `/admin/coach-dna` — confirm "Resume assessment" appears and resumes at the correct question.
6. Answer all remaining questions, confirm the completion screen appears with the expected copy.
7. Reload `/admin/coach-dna` — confirm it now shows "You've completed your self-assessment."

If Playwright MCP tools or admin credentials are not available in this environment, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done — per project convention, do not claim a UI feature works without having tested it in a browser.

- [ ] **Step 4: Commit (only if Steps 1-2 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.

---

## Deferred (future sub-projects)

The radar chart / 8-category dashboard, Player Voice collection, Peer Observation collection,
quick reflection, and promoting Coach DNA out of the admin-only gate into its own top-level nav
section are all separate sub-projects, not part of this plan.
