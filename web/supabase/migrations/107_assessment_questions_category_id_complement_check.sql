alter table public.assessment_questions
  drop constraint category_id_only_for_feedback_types;

alter table public.assessment_questions
  add constraint category_id_only_for_feedback_types check (
    (assessment_type in ('player_voice', 'peer_observation') and category_id is not null)
    or (assessment_type not in ('player_voice', 'peer_observation') and category_id is null)
  );
