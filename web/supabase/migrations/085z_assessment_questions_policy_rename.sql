-- 085z_assessment_questions_policy_rename.sql
-- Rename the misleading RLS policy to accurately reflect its behavior
alter policy "Anyone authenticated can read active questions"
  on public.assessment_questions
  rename to "Anyone authenticated can read questions";
