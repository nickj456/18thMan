# Coach DNA — Design

## Purpose

A continuous coach development system for 18th Man: self-assessment, player feedback, parent
feedback, peer-coach observation, and coach reflection combine into a private coaching profile
across 8 categories. It is not a personality quiz or a performance appraisal — it reads like a
coaching mentor, not a scoreboard. Coaches never see named comparisons to other coaches, and
minors' feedback is protected by strict safeguarding controls (Phase 4).

Full source brief (phases, weights, safeguarding rules, tone/copy rules) is preserved in the
originating conversation; this document adapts it to the real 18th Man schema and conventions and
is the reference for implementation.

## Existing architecture this builds on

- Next.js App Router, Server Components by default, Server Actions in co-located `actions.ts`
  files (`'use server'`), Route Handlers reserved for public APIs/webhooks.
- Supabase: `createClient()` (server, cookie-based, RLS-scoped) for normal reads/writes;
  `createServiceClient()` (service-role, bypasses RLS) only for privileged checks
  (`isClubAdmin()`-style).
- Migrations are sequential numbered SQL files in `web/supabase/migrations/`; every table gets
  RLS policies inline in the same migration that creates it.
- Pure, unit-testable calculation modules live under `src/lib/<feature>/` with co-located
  `*.test.ts` (e.g. `src/lib/match-analysis/aggregate.ts`). The scoring engine (Phase 2) follows
  this pattern exactly.
- Auth users are `profiles` (id, club_id, club_role, `role`: admin|coach|viewer) — there is no
  separate `users` table. `coaching_groups` (max 5 per club, coach/admin-created, members invited
  via `group_invitations`) is the existing "team/squad" concept and is reused for
  `feedback_requests.team_id`.
- Brand: dark charcoal/zinc, orange `#f97316` accent, hexagonal motifs, shadcn/ui, Geist Sans/Mono.

## Phase 1 — Data model

Reused as-is: `profiles` (stands in for `users`), `coaching_groups` (stands in for `team_id`
scoping).

**Coach DNA core**
- `coach_profiles` — id, user_id → profiles(id) unique, age_group, experience_level,
  primary_profile_type, secondary_profile_type, current_focus_category_id →
  dna_categories(id) nullable, created_at, updated_at
- `dna_categories` — id, name, slug, description. Seeded: Teacher, Technician, Motivator,
  Developer, Game Manager, Communicator, Organiser, Culture Builder.
- `assessment_questions` — id, assessment_type enum(`self_assessment`, `player_voice`,
  `peer_observation`), question_text, question_format, age_group nullable, active, version.
  **Resolved:** `age_group` is only ever populated when `assessment_type = 'player_voice'`
  (check constraint enforces this) — self-assessment is one fixed question set for all coaches;
  Player Voice is the only assessment type that needs age-tiered variants (U7-U9 emoji scale,
  U10+ five-point scale, per Phase 3).
- `assessment_options` — id, question_id, option_text, category_weights_json (jsonb:
  `{category_slug: weight}`)
- `assessment_attempts` — id, coach_id → profiles(id), assessment_type, version, started_at,
  completed_at nullable (drives save/resume)
- `assessment_responses` — id, attempt_id, question_id, selected_option →
  assessment_options(id) nullable, written_response nullable, response_value nullable

**Scoring** (split raw-per-source from blended, so the source-comparison view and radar chart
each have a clean read without re-deriving one from the other)
- `coach_scores` — id, coach_id, category_id, source_type enum(`self`, `player_voice`,
  `peer_observation`, `parent_voice`), score, sample_size, calculation_version, calculated_at
- `coach_category_scores` — id, coach_id, category_id, status enum(`scored`,
  `insufficient_data`), blended_score nullable, insufficient_data_message nullable,
  calculation_version, calculated_at — the single number (or explicit gap) the radar chart and
  dashboard read from

**Feedback collection**
- `feedback_requests` — id, coach_id, feedback_type enum(`player_voice`, `peer_observation`),
  team_id → coaching_groups(id) nullable, token, anonymous, expires_at,
  minimum_response_threshold, status enum(`active`, `paused`, `expired`), created_at
- `feedback_responses` — id, feedback_request_id, respondent_type enum(`player`, `parent`,
  `peer_coach`), respondent_id_nullable → profiles(id) (peer coaches only), submitted_at,
  held_for_review boolean, device_fingerprint_hash
- `feedback_answers` — id, feedback_response_id, question_id, numeric_value nullable,
  written_value nullable

**Reflection & recommendations** (reflection carries zero score weight — see Phase 2)
- `coach_reflections` — id, coach_id, session_id_nullable, match_id_nullable, reflection_type,
  answers_json, created_at
- `recommendations` — id, coach_id, category_id, recommendation_type, title, description,
  priority, reason, dismissed_at nullable, completed_at nullable, created_at

**Safeguarding** (added beyond the original entity list — Phase 4 ships alongside Phases 1-3,
not after, so these tables exist from the start)
- `club_guardian_consents` — id, club_id, season_label, granted_by → profiles(id), granted_at.
  One row unlocks the whole season for that club; never re-requested per survey.
- `response_disputes` — id, feedback_response_id, raised_by → profiles(id), reason, status
  enum(`open`, `excluded`, `no_action`), resolved_by nullable, resolved_at nullable, created_at.
  The response stays live and keeps contributing to the score unless a club admin explicitly
  excludes it; that action is logged here. The coach never sees who submitted the original
  response.
- `safeguarding_flags` — id, feedback_answer_id, flagged_text, detection_method
  enum(`automated`, `manual`), status enum(`open`, `reviewed`, `dismissed`), reviewed_by
  nullable, reviewed_at nullable, created_at. Routes only to club admin, never to the coach
  under review.
- `admin_feedback_access_log` — id, admin_id → profiles(id), feedback_response_id, action,
  accessed_at. Full audit trail on any admin access to raw feedback.

**Deferred to Phase Two** (excluded from MVP per the Phase 3 scope below): `development_plans`,
`development_actions`.

## Phase 2 — Score calculation (pure, unit-tested module)

Lives at `src/lib/coach-dna/scoring.ts` (mirrors `src/lib/match-analysis/aggregate.ts`), covered
by `scoring.test.ts`.

**Default weights per category, four sources:**
Self-assessment 25% / Player Voice 35% / Peer coach observation 30% / Parent Voice 10%.
Configurable per category — e.g. Technician: Self 25 / Player 15 / Peer 60 / Parent 0.
Culture Builder: Self 15 / Player 40 / Peer 25 / Parent 20.

**Rules:**
- Reflection data has zero weight in any score. It only feeds recommendations and "Latest
  Insight" text. This was an explicit contradiction in the original brief, resolved this way —
  do not reintroduce reflection into the score.
- Missing/inactive source (below its minimum response threshold, or not yet built — e.g. Parent
  Voice at MVP): excluded, and its weight is redistributed **proportionally** across the
  remaining active sources (not evenly, not left as a gap). Unit test asserts weights always sum
  to 100% regardless of which sources are active.
- Minimum data state: if fewer than two sources are active for a category, or the only active
  source is self-assessment, return an explicit `INSUFFICIENT_DATA` status (with a message like
  "Get N more Player Voice responses to unlock this score") instead of a number. UI renders this
  as a dotted/incomplete radar segment, never a fabricated number. This is exactly what
  `coach_category_scores.status` exists to carry.
- Minimum response thresholds per source, configurable per category.
- Recency weighting — older responses count less.
- Sample-size weighting within Player Voice / Parent Voice.
- Outlier control on Peer Coach observations — cap the influence of a single extreme rating.
- Score change limits per calculation cycle — a category can't jump more than a set number of
  points in one update.
- Question-set versioning (`assessment_questions.version`, `coach_scores.calculation_version`)
  so edits to question sets don't corrupt historical score comparisons.

**Required test cases:** all-sources-active; one-source-missing; two-sources-missing;
below-threshold-everywhere (→ `INSUFFICIENT_DATA`); a single outlier response not swinging the
score; weight redistribution always sums to 100%.

Per your working agreement: the weight-redistribution and insufficient-data test output gets
shown to you for review before Phase 3 UI work starts.

## Phase 3 — MVP feature scope

Build only this for v1. **Not built yet** (Phase Two): Parent Voice, development plans,
challenges, learning content library.

- Coach DNA initial self-assessment: 24-32 scenario-based questions, save/resume, no reveal of
  which category each answer affects.
- The 8 categories with score + radar chart, respecting `INSUFFICIENT_DATA`.
- Player Voice: shareable link + QR code, age-tiered question sets (U7-U9 emoji scale, U10+
  five-point scale), anonymous by default under 13, expiring links.
- Peer Coach observation: structured link, ratings + evidence notes + one strength + one
  development area + one action.
- Quick reflection: post-session, ~1 minute, 6 questions.
- Tips/recommendations surfaced for the lowest-scoring category.
- One active "focus category" shown on the dashboard.
- Feedback source comparison view: self vs players vs peers, shown separately — never blended
  into one number without a breakdown.
- Rule-based text summary from current data; an LLM call is only justified for summarizing
  open-text feedback, never for computing the numeric score.

## Phase 4 — Safeguarding and abuse controls (non-negotiable, built alongside Phases 1-3)

- Guardian consent captured once per season at club level for players under 16
  (`club_guardian_consents`) — never re-requested per survey.
- Anonymous response on by default for players under 13.
- Minimum response thresholds enforced before any score, summary, or individual response is
  visible to a coach.
- No public coach rankings, no named coach-to-coach comparison, anywhere in UI or API.
- No individual child profile assemblable from anonymous responses, even via internal tooling.
- Data retention: default 12 months, club-configurable downward only.
- Submitted feedback is immutable — coaches cannot edit or delete it.
- Full audit log on any admin access to raw feedback (`admin_feedback_access_log`): who viewed
  what, when.
- Automated flagging of safeguarding-relevant language in open-text fields
  (`safeguarding_flags`), routed only to club admin, never the coach under review.
- In-app copy makes clear surveys are not an emergency reporting channel, with a link to
  appropriate reporting resources wherever a flag fires.
- AI may summarize/group flagged text but must never auto-close, dismiss, or escalate a flag — a
  human admin decides every time.
- Dispute flow (`response_disputes`): coach can flag an individual response as "may not be a
  fair reflection" with a required reason. The response stays in the data and keeps contributing
  to the score unless a club admin explicitly excludes it — logged. Coach never sees who
  submitted the original response.
- Spam/abuse: feedback links rate-limited per device/IP, expire on a set date, near-duplicate
  open-text submissions in a short window held for review instead of auto-counted, admin can
  pause a link immediately, abnormal submission bursts (e.g. 20 responses in 90 seconds)
  auto-flag before affecting any score.

## Brand and tone

Dark charcoal/zinc backgrounds, orange `#f97316` accents, hexagonal motifs — match existing
identity. Copy is practical, coach-to-coach, never corporate or clinical-assessment-speak. Never
"you are good/bad" — always strengths / development areas / next action. AI-generated insight
text always references its evidence (e.g. "three of the last four peer observations mentioned
long explanations"). No em dashes in any UI copy or generated text.

## Rollout

Work proceeds phase by phase with a check-in after each phase:
1. Data model (this doc) → migrations + seed.
2. Score calculation module + tests, reviewed before UI work starts.
3. MVP feature UI/routes.
4. Safeguarding controls, built alongside 1-3, verified before any real feedback link goes live.
