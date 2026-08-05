alter table public.assessment_questions
  add column category_id uuid references public.dna_categories(id);

alter table public.assessment_questions
  add constraint category_id_only_for_feedback_types check (
    (assessment_type in ('player_voice', 'peer_observation') and category_id is not null)
    or (assessment_type = 'self_assessment' and category_id is null)
  );

create index assessment_questions_category_id_idx on public.assessment_questions(category_id);
