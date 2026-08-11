-- 111_assessment_responses_least_option.sql
alter table public.assessment_responses
  add column least_option uuid references public.assessment_options(id);
