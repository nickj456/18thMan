-- ── Restrict scoring-weight exposure on assessment_options ─────────────────
-- Migration 085's "Anyone authenticated can read options" RLS policy is
-- `using (auth.uid() is not null)` — any authenticated coach can SELECT the
-- whole assessment_options table, including category_weights_json (the
-- hidden weighting key that drives Coach DNA scoring). Row-level policies
-- cannot hide individual columns, so a coach could read their own scoring
-- weights directly via the Supabase client and reverse-engineer or game the
-- assessment, defeating the point of a self-assessment.
--
-- Same fix shape as 075 (clubs) and 078 (products): revoke the table-level
-- SELECT grant and re-grant an explicit column list that excludes the
-- sensitive column. service_role keeps its own table-level grant and is
-- unaffected — server-side scoring code (computeCategoryScore) reads
-- category_weights_json through it.
--
-- Consequence: `select('*')` on assessment_options from anon/authenticated
-- now fails with 42501. The question-wizard query already uses an explicit
-- `select('id, option_text')` (see assessment/[attemptId]/page.tsx), so this
-- is a no-op for existing app code. Future columns added to
-- assessment_options MUST extend this grant if they should be coach-visible.

revoke select on public.assessment_options from anon, authenticated;

grant select (
  id,
  question_id,
  option_text
) on public.assessment_options to authenticated;
