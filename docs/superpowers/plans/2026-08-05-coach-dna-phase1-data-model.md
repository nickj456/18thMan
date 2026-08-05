# Coach DNA — Phase 1 Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the full Coach DNA database schema (assessment, scoring, feedback collection, reflection, recommendations, and safeguarding tables) as Supabase migrations with RLS, plus matching hand-maintained TypeScript row types.

**Architecture:** One migration file per related table group, following `web/supabase/migrations/NNN_description.sql` numbering (continuing from `082`). Every migration enables RLS and defines policies inline, matching the existing convention (see `018_coaching_groups.sql`, `20260601153744_admin_user_notes.sql`). Each task also adds the corresponding TypeScript interfaces to `web/src/lib/supabase/types.ts`, matching the existing hand-maintained style (plain `export interface`, snake_case fields, `string` for uuid/timestamptz, `| null` for nullable columns).

**Tech Stack:** Supabase Postgres migrations (plain SQL), applied via the `claude.ai Supabase` MCP tools (`apply_migration`, `execute_sql`, `list_tables`) since this repo has no locally linked Supabase CLI project.

## Global Constraints

- Every table must have Row Level Security enabled — never skip RLS (project CLAUDE.md).
- Auth users are `profiles` (id, club_id, club_role, `role`: `admin`|`coach`|`viewer`) — never create a new `users` table.
- `coaching_groups(id)` is the existing team/squad concept — reuse it, never introduce a parallel `teams` table.
- `assessment_questions.age_group` is nullable and only ever populated when `assessment_type = 'player_voice'` — enforce with a check constraint (design doc, Phase 1, resolved question).
- Migration files never mutate the schema outside `web/supabase/migrations/` — no manual dashboard changes.
- Generated/hand-maintained types in `web/src/lib/supabase/types.ts` must be updated in the same task that adds the table, matching existing interface style exactly (see `CoachingGroup`, `Profile` in that file).
- No `any` types anywhere in TypeScript changes.
- Use the Supabase MCP tools (`mcp__claude_ai_Supabase__apply_migration`, `execute_sql`, `list_tables`) to apply and verify every migration — there is no local `supabase start` in this project.

---

### Task 1: `dna_categories`

**Files:**
- Create: `web/supabase/migrations/083_dna_categories.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `DnaCategory { id: string; name: string; slug: string; description: string; created_at: string }` — every later Coach DNA table with a `category_id` FK references `dna_categories(id)`.

- [ ] **Step 1: Write the migration**

```sql
-- 083_dna_categories.sql
create table public.dna_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null,
  created_at  timestamptz not null default now()
);

alter table public.dna_categories enable row level security;

create policy "Anyone authenticated can read dna categories"
  on public.dna_categories for select
  using (auth.uid() is not null);

create policy "Admins can manage dna categories"
  on public.dna_categories for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

insert into public.dna_categories (name, slug, description) values
  ('Teacher', 'teacher', 'Explains skills clearly and helps players understand the why, not just the how.'),
  ('Technician', 'technician', 'Sharp eye for technical detail in tackling, ball skills, and set piece execution.'),
  ('Motivator', 'motivator', 'Builds energy, confidence, and belief in individuals and the team.'),
  ('Developer', 'developer', 'Focused on long-term player growth over short-term results.'),
  ('Game Manager', 'game-manager', 'Makes sound tactical and in-game decisions under pressure.'),
  ('Communicator', 'communicator', 'Clear, consistent communication with players, parents, and staff.'),
  ('Organiser', 'organiser', 'Sessions and logistics run smoothly and players know what to expect.'),
  ('Culture Builder', 'culture-builder', 'Shapes a team environment players and parents want to be part of.')
on conflict (slug) do nothing;
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "dna_categories"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__execute_sql` with:
```sql
select slug, name from public.dna_categories order by slug;
```
Expected: 8 rows, slugs `culture-builder, developer, game-manager, motivator, organiser, teacher, technician` (alphabetical) all present.

- [ ] **Step 4: Add the TypeScript type**

In `web/src/lib/supabase/types.ts`, add near the other reference-data interfaces (e.g. after `DrillCategory`):

```ts
export interface DnaCategory {
  id: string
  name: string
  slug: string
  description: string
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/083_dna_categories.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add dna_categories table with seed data"
```

---

### Task 2: `coach_profiles`

**Files:**
- Create: `web/supabase/migrations/084_coach_profiles.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `dna_categories(id)` from Task 1.
- Produces: `CoachProfile { id: string; user_id: string; age_group: string; experience_level: string; primary_profile_type: string | null; secondary_profile_type: string | null; current_focus_category_id: string | null; created_at: string; updated_at: string }`.

- [ ] **Step 1: Write the migration**

```sql
-- 084_coach_profiles.sql
create table public.coach_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references public.profiles(id) on delete cascade,
  age_group                   text not null,
  experience_level            text not null,
  primary_profile_type        text,
  secondary_profile_type      text,
  current_focus_category_id   uuid references public.dna_categories(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index coach_profiles_user_id_idx on public.coach_profiles(user_id);

alter table public.coach_profiles enable row level security;

create policy "Coach can view own coach profile"
  on public.coach_profiles for select
  using (user_id = auth.uid());

create policy "Coach can insert own coach profile"
  on public.coach_profiles for insert
  with check (user_id = auth.uid());

create policy "Coach can update own coach profile"
  on public.coach_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "coach_profiles"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__list_tables` and confirm `coach_profiles` appears with RLS enabled (`rls_enabled: true`).

- [ ] **Step 4: Add the TypeScript type**

```ts
export interface CoachProfile {
  id: string
  user_id: string
  age_group: string
  experience_level: string
  primary_profile_type: string | null
  secondary_profile_type: string | null
  current_focus_category_id: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/084_coach_profiles.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add coach_profiles table"
```

---

### Task 3: `assessment_questions` and `assessment_options`

**Files:**
- Create: `web/supabase/migrations/085_assessment_questions.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `AssessmentType = 'self_assessment' | 'player_voice' | 'peer_observation'`, `AssessmentQuestion { id: string; assessment_type: AssessmentType; question_text: string; question_format: string; age_group: string | null; active: boolean; version: number }`, `AssessmentOption { id: string; question_id: string; option_text: string; category_weights_json: Record<string, number> }`.

- [ ] **Step 1: Write the migration**

```sql
-- 085_assessment_questions.sql
create type public.assessment_type as enum ('self_assessment', 'player_voice', 'peer_observation');

create table public.assessment_questions (
  id              uuid primary key default gen_random_uuid(),
  assessment_type public.assessment_type not null,
  question_text   text not null,
  question_format text not null,
  age_group       text,
  active          boolean not null default true,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  constraint age_group_only_for_player_voice check (
    (assessment_type = 'player_voice' and age_group is not null)
    or (assessment_type <> 'player_voice' and age_group is null)
  )
);

create table public.assessment_options (
  id                    uuid primary key default gen_random_uuid(),
  question_id           uuid not null references public.assessment_questions(id) on delete cascade,
  option_text           text not null,
  category_weights_json jsonb not null default '{}'::jsonb
);

create index assessment_questions_type_idx on public.assessment_questions(assessment_type, active);
create index assessment_options_question_id_idx on public.assessment_options(question_id);

alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;

create policy "Anyone authenticated can read active questions"
  on public.assessment_questions for select
  using (auth.uid() is not null);

create policy "Admins can manage questions"
  on public.assessment_questions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone authenticated can read options"
  on public.assessment_options for select
  using (auth.uid() is not null);

create policy "Admins can manage options"
  on public.assessment_options for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "assessment_questions"` and the SQL above.

- [ ] **Step 3: Verify the check constraint**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group)
values ('self_assessment', 'test', 'scenario_choice', 'U10');
```
Expected: error violating `age_group_only_for_player_voice` (self_assessment must have null age_group). This confirms Task 1's design resolution is enforced at the database level, not just in application code.

- [ ] **Step 4: Add the TypeScript types**

```ts
export type AssessmentType = 'self_assessment' | 'player_voice' | 'peer_observation'

export interface AssessmentQuestion {
  id: string
  assessment_type: AssessmentType
  question_text: string
  question_format: string
  age_group: string | null
  active: boolean
  version: number
  created_at: string
}

export interface AssessmentOption {
  id: string
  question_id: string
  option_text: string
  category_weights_json: Record<string, number>
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/085_assessment_questions.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add assessment_questions and assessment_options tables"
```

---

### Task 4: `assessment_attempts` and `assessment_responses`

**Files:**
- Create: `web/supabase/migrations/086_assessment_attempts.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `AssessmentType` and `assessment_questions(id)` / `assessment_options(id)` from Task 3.
- Produces: `AssessmentAttempt { id: string; coach_id: string; assessment_type: AssessmentType; version: number; started_at: string; completed_at: string | null }`, `AssessmentResponse { id: string; attempt_id: string; question_id: string; selected_option: string | null; written_response: string | null; response_value: number | null }`.

- [ ] **Step 1: Write the migration**

```sql
-- 086_assessment_attempts.sql
create table public.assessment_attempts (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.profiles(id) on delete cascade,
  assessment_type public.assessment_type not null,
  version         integer not null default 1,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create table public.assessment_responses (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id       uuid not null references public.assessment_questions(id),
  selected_option   uuid references public.assessment_options(id),
  written_response  text,
  response_value    numeric,
  unique (attempt_id, question_id)
);

create index assessment_attempts_coach_id_idx on public.assessment_attempts(coach_id);
create index assessment_responses_attempt_id_idx on public.assessment_responses(attempt_id);

alter table public.assessment_attempts enable row level security;
alter table public.assessment_responses enable row level security;

create policy "Coach can view own attempts"
  on public.assessment_attempts for select
  using (coach_id = auth.uid());

create policy "Coach can insert own attempts"
  on public.assessment_attempts for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own attempts"
  on public.assessment_attempts for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view own responses"
  on public.assessment_responses for select
  using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );

create policy "Coach can insert own responses"
  on public.assessment_responses for insert
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );

create policy "Coach can update own responses"
  on public.assessment_responses for update
  using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "assessment_attempts"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__list_tables` and confirm both `assessment_attempts` and `assessment_responses` exist with `rls_enabled: true`.

- [ ] **Step 4: Add the TypeScript types**

```ts
export interface AssessmentAttempt {
  id: string
  coach_id: string
  assessment_type: AssessmentType
  version: number
  started_at: string
  completed_at: string | null
}

export interface AssessmentResponse {
  id: string
  attempt_id: string
  question_id: string
  selected_option: string | null
  written_response: string | null
  response_value: number | null
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/086_assessment_attempts.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add assessment_attempts and assessment_responses tables"
```

---

### Task 5: `coach_scores` and `coach_category_scores`

**Files:**
- Create: `web/supabase/migrations/087_coach_scores.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `dna_categories(id)` from Task 1.
- Produces: `ScoreSourceType = 'self' | 'player_voice' | 'peer_observation' | 'parent_voice'`, `CoachScoreStatus = 'scored' | 'insufficient_data'`, `CoachScore { id: string; coach_id: string; category_id: string; source_type: ScoreSourceType; score: number; sample_size: number; calculation_version: number; calculated_at: string }`, `CoachCategoryScore { id: string; coach_id: string; category_id: string; status: CoachScoreStatus; blended_score: number | null; insufficient_data_message: string | null; calculation_version: number; calculated_at: string }`.
- These tables are written exclusively by the server-side scoring module (Phase 2) via the service-role client — RLS intentionally has no `insert`/`update`/`delete` policy for `authenticated`, only `select`.

- [ ] **Step 1: Write the migration**

```sql
-- 087_coach_scores.sql
create type public.score_source_type as enum ('self', 'player_voice', 'peer_observation', 'parent_voice');
create type public.coach_score_status as enum ('scored', 'insufficient_data');

create table public.coach_scores (
  id                   uuid primary key default gen_random_uuid(),
  coach_id             uuid not null references public.profiles(id) on delete cascade,
  category_id          uuid not null references public.dna_categories(id),
  source_type          public.score_source_type not null,
  score                numeric not null,
  sample_size          integer not null default 0,
  calculation_version  integer not null default 1,
  calculated_at        timestamptz not null default now(),
  unique (coach_id, category_id, source_type, calculation_version)
);

create table public.coach_category_scores (
  id                          uuid primary key default gen_random_uuid(),
  coach_id                    uuid not null references public.profiles(id) on delete cascade,
  category_id                 uuid not null references public.dna_categories(id),
  status                      public.coach_score_status not null,
  blended_score               numeric,
  insufficient_data_message   text,
  calculation_version         integer not null default 1,
  calculated_at               timestamptz not null default now(),
  unique (coach_id, category_id),
  constraint blended_score_matches_status check (
    (status = 'scored' and blended_score is not null)
    or (status = 'insufficient_data' and blended_score is null)
  )
);

create index coach_scores_coach_id_idx on public.coach_scores(coach_id);
create index coach_category_scores_coach_id_idx on public.coach_category_scores(coach_id);

alter table public.coach_scores enable row level security;
alter table public.coach_category_scores enable row level security;

create policy "Coach can view own scores"
  on public.coach_scores for select
  using (coach_id = auth.uid());

create policy "Coach can view own category scores"
  on public.coach_category_scores for select
  using (coach_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "coach_scores"` and the SQL above.

- [ ] **Step 3: Verify the status/score check constraint**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
insert into public.coach_category_scores (coach_id, category_id, status, blended_score)
select id, (select id from public.dna_categories limit 1), 'insufficient_data', 42
from public.profiles limit 1;
```
Expected: error violating `blended_score_matches_status` — an `insufficient_data` row can never carry a fabricated number, enforced at the database level per the design doc's Phase 2 rule.

- [ ] **Step 4: Add the TypeScript types**

```ts
export type ScoreSourceType = 'self' | 'player_voice' | 'peer_observation' | 'parent_voice'
export type CoachScoreStatus = 'scored' | 'insufficient_data'

export interface CoachScore {
  id: string
  coach_id: string
  category_id: string
  source_type: ScoreSourceType
  score: number
  sample_size: number
  calculation_version: number
  calculated_at: string
}

export interface CoachCategoryScore {
  id: string
  coach_id: string
  category_id: string
  status: CoachScoreStatus
  blended_score: number | null
  insufficient_data_message: string | null
  calculation_version: number
  calculated_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/087_coach_scores.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add coach_scores and coach_category_scores tables"
```

---

### Task 6: `feedback_requests`, `feedback_responses`, `feedback_answers`

**Files:**
- Create: `web/supabase/migrations/088_feedback_requests.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `coaching_groups(id)`, `assessment_questions(id)`.
- Produces: `FeedbackType = 'player_voice' | 'peer_observation'`, `RespondentType = 'player' | 'parent' | 'peer_coach'`, `FeedbackRequestStatus = 'active' | 'paused' | 'expired'`, `FeedbackRequest { id: string; coach_id: string; feedback_type: FeedbackType; team_id: string | null; token: string; anonymous: boolean; expires_at: string; minimum_response_threshold: number; status: FeedbackRequestStatus; created_at: string }`, `FeedbackResponse { id: string; feedback_request_id: string; respondent_type: RespondentType; respondent_id_nullable: string | null; submitted_at: string; held_for_review: boolean; device_fingerprint_hash: string }`, `FeedbackAnswer { id: string; feedback_response_id: string; question_id: string; numeric_value: number | null; written_value: string | null }`.
- Respondents to Player Voice / Parent Voice links have no account. Rows in `feedback_responses`/`feedback_answers` are written server-side via the service-role client from a public Route Handler (built in a later phase) — RLS here intentionally has no `insert` policy for `authenticated`/`anon`, only `select` for the owning coach and platform admins. This also enforces the design doc's "submitted feedback is immutable" rule (no `update`/`delete` policy for anyone).

- [ ] **Step 1: Write the migration**

```sql
-- 088_feedback_requests.sql
create type public.feedback_type as enum ('player_voice', 'peer_observation');
create type public.respondent_type as enum ('player', 'parent', 'peer_coach');
create type public.feedback_request_status as enum ('active', 'paused', 'expired');

create table public.feedback_requests (
  id                           uuid primary key default gen_random_uuid(),
  coach_id                     uuid not null references public.profiles(id) on delete cascade,
  feedback_type                public.feedback_type not null,
  team_id                      uuid references public.coaching_groups(id) on delete set null,
  token                        text not null unique,
  anonymous                    boolean not null default true,
  expires_at                   timestamptz not null,
  minimum_response_threshold   integer not null default 3,
  status                       public.feedback_request_status not null default 'active',
  created_at                   timestamptz not null default now()
);

create table public.feedback_responses (
  id                        uuid primary key default gen_random_uuid(),
  feedback_request_id      uuid not null references public.feedback_requests(id) on delete cascade,
  respondent_type           public.respondent_type not null,
  respondent_id_nullable     uuid references public.profiles(id),
  submitted_at               timestamptz not null default now(),
  held_for_review            boolean not null default false,
  device_fingerprint_hash    text not null
);

create table public.feedback_answers (
  id                    uuid primary key default gen_random_uuid(),
  feedback_response_id  uuid not null references public.feedback_responses(id) on delete cascade,
  question_id           uuid not null references public.assessment_questions(id),
  numeric_value         numeric,
  written_value         text
);

create index feedback_requests_coach_id_idx on public.feedback_requests(coach_id);
create index feedback_requests_token_idx on public.feedback_requests(token);
create index feedback_responses_request_id_idx on public.feedback_responses(feedback_request_id);
create index feedback_answers_response_id_idx on public.feedback_answers(feedback_response_id);

alter table public.feedback_requests enable row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_answers enable row level security;

create policy "Coach can view own feedback requests"
  on public.feedback_requests for select
  using (coach_id = auth.uid());

create policy "Coach can create own feedback requests"
  on public.feedback_requests for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own feedback requests"
  on public.feedback_requests for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view responses to own requests"
  on public.feedback_responses for select
  using (
    exists (
      select 1 from public.feedback_requests r
      where r.id = feedback_responses.feedback_request_id and r.coach_id = auth.uid()
    )
  );

create policy "Admins can view all feedback responses"
  on public.feedback_responses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Coach can view answers to own requests"
  on public.feedback_answers for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      where resp.id = feedback_answers.feedback_response_id and r.coach_id = auth.uid()
    )
  );

create policy "Admins can view all feedback answers"
  on public.feedback_answers for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "feedback_requests"` and the SQL above.

- [ ] **Step 3: Verify no client-side insert path exists on responses**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
select tablename, policyname, cmd from pg_policies
where tablename in ('feedback_responses', 'feedback_answers')
order by tablename, cmd;
```
Expected: only `select` rows returned for both tables — confirms respondent submissions cannot bypass the service-role Route Handler.

- [ ] **Step 4: Add the TypeScript types**

```ts
export type FeedbackType = 'player_voice' | 'peer_observation'
export type RespondentType = 'player' | 'parent' | 'peer_coach'
export type FeedbackRequestStatus = 'active' | 'paused' | 'expired'

export interface FeedbackRequest {
  id: string
  coach_id: string
  feedback_type: FeedbackType
  team_id: string | null
  token: string
  anonymous: boolean
  expires_at: string
  minimum_response_threshold: number
  status: FeedbackRequestStatus
  created_at: string
}

export interface FeedbackResponse {
  id: string
  feedback_request_id: string
  respondent_type: RespondentType
  respondent_id_nullable: string | null
  submitted_at: string
  held_for_review: boolean
  device_fingerprint_hash: string
}

export interface FeedbackAnswer {
  id: string
  feedback_response_id: string
  question_id: string
  numeric_value: number | null
  written_value: string | null
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/088_feedback_requests.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add feedback_requests, feedback_responses, feedback_answers tables"
```

---

### Task 7: `coach_reflections` and `recommendations`

**Files:**
- Create: `web/supabase/migrations/089_coach_reflections.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `dna_categories(id)` from Task 1.
- Produces: `CoachReflection { id: string; coach_id: string; session_id_nullable: string | null; match_id_nullable: string | null; reflection_type: string; answers_json: Record<string, unknown>; created_at: string }`, `Recommendation { id: string; coach_id: string; category_id: string; recommendation_type: string; title: string; description: string; priority: number; reason: string; dismissed_at: string | null; completed_at: string | null; created_at: string }`.
- Recommendations are system-generated (by the Phase 2/3 recommendation engine, via service role) — a coach may only `update` (to dismiss/complete) and `select`, never `insert`.

- [ ] **Step 1: Write the migration**

```sql
-- 089_coach_reflections.sql
create table public.coach_reflections (
  id                  uuid primary key default gen_random_uuid(),
  coach_id            uuid not null references public.profiles(id) on delete cascade,
  session_id_nullable uuid,
  match_id_nullable   uuid,
  reflection_type     text not null,
  answers_json        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create table public.recommendations (
  id                  uuid primary key default gen_random_uuid(),
  coach_id            uuid not null references public.profiles(id) on delete cascade,
  category_id         uuid not null references public.dna_categories(id),
  recommendation_type text not null,
  title               text not null,
  description         text not null,
  priority            integer not null default 0,
  reason              text not null,
  dismissed_at        timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index coach_reflections_coach_id_idx on public.coach_reflections(coach_id);
create index recommendations_coach_id_idx on public.recommendations(coach_id);

alter table public.coach_reflections enable row level security;
alter table public.recommendations enable row level security;

create policy "Coach can view own reflections"
  on public.coach_reflections for select
  using (coach_id = auth.uid());

create policy "Coach can insert own reflections"
  on public.coach_reflections for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own reflections"
  on public.coach_reflections for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view own recommendations"
  on public.recommendations for select
  using (coach_id = auth.uid());

create policy "Coach can update own recommendations"
  on public.recommendations for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "coach_reflections"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__list_tables` and confirm `coach_reflections` and `recommendations` exist with `rls_enabled: true`, and via `execute_sql`:
```sql
select tablename, policyname, cmd from pg_policies where tablename = 'recommendations';
```
Expected: only `select` and `update` policies — no `insert` policy for authenticated users.

- [ ] **Step 4: Add the TypeScript types**

```ts
export interface CoachReflection {
  id: string
  coach_id: string
  session_id_nullable: string | null
  match_id_nullable: string | null
  reflection_type: string
  answers_json: Record<string, unknown>
  created_at: string
}

export interface Recommendation {
  id: string
  coach_id: string
  category_id: string
  recommendation_type: string
  title: string
  description: string
  priority: number
  reason: string
  dismissed_at: string | null
  completed_at: string | null
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/089_coach_reflections.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add coach_reflections and recommendations tables"
```

---

### Task 8: `club_guardian_consents`

**Files:**
- Create: `web/supabase/migrations/090_club_guardian_consents.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `ClubGuardianConsent { id: string; club_id: string; season_label: string; granted_by: string; granted_at: string }`.

- [ ] **Step 1: Write the migration**

```sql
-- 090_club_guardian_consents.sql
create table public.club_guardian_consents (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  season_label text not null,
  granted_by   uuid not null references public.profiles(id),
  granted_at   timestamptz not null default now(),
  unique (club_id, season_label)
);

create index club_guardian_consents_club_id_idx on public.club_guardian_consents(club_id);

alter table public.club_guardian_consents enable row level security;

create policy "Club admins can view consents for their club"
  on public.club_guardian_consents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = club_guardian_consents.club_id
        and club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Club admins can grant consent for their club"
  on public.club_guardian_consents for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = club_guardian_consents.club_id
        and club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "club_guardian_consents"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__list_tables` and confirm `club_guardian_consents` exists with `rls_enabled: true` and the `unique (club_id, season_label)` constraint is present (query `pg_indexes` or attempt a duplicate insert via `execute_sql` and confirm it errors).

- [ ] **Step 4: Add the TypeScript type**

```ts
export interface ClubGuardianConsent {
  id: string
  club_id: string
  season_label: string
  granted_by: string
  granted_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/090_club_guardian_consents.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add club_guardian_consents table"
```

---

### Task 9: `response_disputes`

**Files:**
- Create: `web/supabase/migrations/091_response_disputes.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `feedback_responses(id)`, `feedback_requests(coach_id)` from Task 6.
- Produces: `DisputeStatus = 'open' | 'excluded' | 'no_action'`, `ResponseDispute { id: string; feedback_response_id: string; raised_by: string; reason: string; status: DisputeStatus; resolved_by: string | null; resolved_at: string | null; created_at: string }`.
- The coach raising a dispute must never be able to see who submitted the original response — this table only stores the dispute reason and status, never respondent identity, and RLS only lets the raising coach see their own dispute rows (not the underlying anonymous response's respondent fields, which live in a separate table with its own policy from Task 6).

- [ ] **Step 1: Write the migration**

```sql
-- 091_response_disputes.sql
create type public.dispute_status as enum ('open', 'excluded', 'no_action');

create table public.response_disputes (
  id                    uuid primary key default gen_random_uuid(),
  feedback_response_id  uuid not null references public.feedback_responses(id) on delete cascade,
  raised_by             uuid not null references public.profiles(id),
  reason                text not null,
  status                public.dispute_status not null default 'open',
  resolved_by           uuid references public.profiles(id),
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  unique (feedback_response_id, raised_by)
);

create index response_disputes_response_id_idx on public.response_disputes(feedback_response_id);

alter table public.response_disputes enable row level security;

create policy "Coach can view own disputes"
  on public.response_disputes for select
  using (raised_by = auth.uid());

create policy "Coach can raise a dispute on a response to their own request"
  on public.response_disputes for insert
  with check (
    raised_by = auth.uid()
    and exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      where resp.id = response_disputes.feedback_response_id and r.coach_id = auth.uid()
    )
  );

create policy "Club admins can view disputes for their club's coaches"
  on public.response_disputes for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Club admins can resolve disputes for their club's coaches"
  on public.response_disputes for update
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "response_disputes"` and the SQL above.

- [ ] **Step 3: Verify**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
select tablename, policyname, cmd from pg_policies where tablename = 'response_disputes' order by cmd;
```
Expected: `select` (x2), `insert`, `update` policies present; no `delete` policy — disputes, once raised, are never deleted, only resolved.

- [ ] **Step 4: Add the TypeScript types**

```ts
export type DisputeStatus = 'open' | 'excluded' | 'no_action'

export interface ResponseDispute {
  id: string
  feedback_response_id: string
  raised_by: string
  reason: string
  status: DisputeStatus
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/091_response_disputes.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add response_disputes table"
```

---

### Task 10: `safeguarding_flags` and `admin_feedback_access_log`

**Files:**
- Create: `web/supabase/migrations/092_safeguarding_flags.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Consumes: `feedback_answers(id)` from Task 6.
- Produces: `SafeguardingFlagStatus = 'open' | 'reviewed' | 'dismissed'`, `SafeguardingFlag { id: string; feedback_answer_id: string; flagged_text: string; detection_method: 'automated' | 'manual'; status: SafeguardingFlagStatus; reviewed_by: string | null; reviewed_at: string | null; created_at: string }`, `AdminFeedbackAccessLog { id: string; admin_id: string; feedback_response_id: string; action: string; accessed_at: string }`.
- Both tables intentionally have no `insert`/`update` policy for `authenticated` — flags are raised by the automated detector or a club admin acting server-side, and access-log rows are written by the server whenever an admin views raw feedback, never by the client directly. This is what makes the log trustworthy: a client can't skip logging its own access.

- [ ] **Step 1: Write the migration**

```sql
-- 092_safeguarding_flags.sql
create type public.safeguarding_flag_status as enum ('open', 'reviewed', 'dismissed');
create type public.flag_detection_method as enum ('automated', 'manual');

create table public.safeguarding_flags (
  id                 uuid primary key default gen_random_uuid(),
  feedback_answer_id uuid not null references public.feedback_answers(id) on delete cascade,
  flagged_text       text not null,
  detection_method   public.flag_detection_method not null,
  status             public.safeguarding_flag_status not null default 'open',
  reviewed_by        uuid references public.profiles(id),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table public.admin_feedback_access_log (
  id                   uuid primary key default gen_random_uuid(),
  admin_id             uuid not null references public.profiles(id),
  feedback_response_id uuid not null references public.feedback_responses(id) on delete cascade,
  action               text not null,
  accessed_at          timestamptz not null default now()
);

create index safeguarding_flags_answer_id_idx on public.safeguarding_flags(feedback_answer_id);
create index admin_feedback_access_log_response_id_idx on public.admin_feedback_access_log(feedback_response_id);

alter table public.safeguarding_flags enable row level security;
alter table public.admin_feedback_access_log enable row level security;

create policy "Club admins can view flags for their club's coaches"
  on public.safeguarding_flags for select
  using (
    exists (
      select 1 from public.feedback_answers ans
      join public.feedback_responses resp on resp.id = ans.feedback_response_id
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where ans.id = safeguarding_flags.feedback_answer_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Club admins can review flags for their club's coaches"
  on public.safeguarding_flags for update
  using (
    exists (
      select 1 from public.feedback_answers ans
      join public.feedback_responses resp on resp.id = ans.feedback_response_id
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where ans.id = safeguarding_flags.feedback_answer_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (
      select 1 from public.feedback_answers ans
      join public.feedback_responses resp on resp.id = ans.feedback_response_id
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where ans.id = safeguarding_flags.feedback_answer_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Platform admins can view the access log"
  on public.admin_feedback_access_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "safeguarding_flags"` and the SQL above.

- [ ] **Step 3: Verify no client insert path exists**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
select tablename, policyname, cmd from pg_policies
where tablename in ('safeguarding_flags', 'admin_feedback_access_log')
order by tablename, cmd;
```
Expected: `safeguarding_flags` has only `select`/`update` policies (no `insert`); `admin_feedback_access_log` has only a `select` policy (no `insert`/`update`) — both writes must go through service-role server code, confirming the audit trail can't be forged or skipped by a client.

- [ ] **Step 4: Add the TypeScript types**

```ts
export type SafeguardingFlagStatus = 'open' | 'reviewed' | 'dismissed'
export type FlagDetectionMethod = 'automated' | 'manual'

export interface SafeguardingFlag {
  id: string
  feedback_answer_id: string
  flagged_text: string
  detection_method: FlagDetectionMethod
  status: SafeguardingFlagStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AdminFeedbackAccessLog {
  id: string
  admin_id: string
  feedback_response_id: string
  action: string
  accessed_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/092_safeguarding_flags.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add safeguarding_flags and admin_feedback_access_log tables"
```

---

### Task 11: Full schema smoke test

**Files:**
- None created — this task only verifies Tasks 1-10 together.

**Interfaces:**
- Consumes: every table and type produced by Tasks 1-10.

- [ ] **Step 1: List all Coach DNA tables and confirm RLS**

Use `mcp__claude_ai_Supabase__list_tables` and confirm all of the following are present with `rls_enabled: true`: `dna_categories`, `coach_profiles`, `assessment_questions`, `assessment_options`, `assessment_attempts`, `assessment_responses`, `coach_scores`, `coach_category_scores`, `feedback_requests`, `feedback_responses`, `feedback_answers`, `coach_reflections`, `recommendations`, `club_guardian_consents`, `response_disputes`, `safeguarding_flags`, `admin_feedback_access_log`.

- [ ] **Step 2: Run the Supabase advisor check**

Use `mcp__claude_ai_Supabase__get_advisors` with `type: "security"`. Expected: no new lint warnings referencing any `coach_*`, `assessment_*`, `feedback_*`, `dna_*`, `response_disputes`, `safeguarding_flags`, `admin_feedback_access_log`, or `club_guardian_consents` table (e.g. no "RLS enabled but no policies" or "missing RLS" warnings). Fix any that appear before proceeding.

- [ ] **Step 3: Run the project test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors — confirms every new interface added to `types.ts` across Tasks 1-10 is syntactically valid and doesn't collide with an existing exported name.

Run: `cd web && npm run test`
Expected: all existing tests still pass (this task adds no new `*.test.ts` files — Phase 1 is schema only; the scoring module and its tests are Phase 2).

- [ ] **Step 4: Commit (only if Step 2 required fixes)**

If the advisor check in Step 2 required any migration fixes, write a follow-up migration file (next sequential number) with the fix, apply it, and commit:

```bash
git add web/supabase/migrations/ web/src/lib/supabase/types.ts
git commit -m "fix(coach-dna): address security advisor findings on Phase 1 schema"
```

If no fixes were needed, skip this step — Phase 1 is complete as of Task 10's commit.

---

## Deferred to Phase 2

The scoring calculation module (`src/lib/coach-dna/scoring.ts`), its unit tests, and the recommendation-generation logic all read from and write to the tables created here, but are out of scope for this plan per the design doc's phase rollout. Do not start Phase 2 until this plan's Task 11 is complete and reviewed.
