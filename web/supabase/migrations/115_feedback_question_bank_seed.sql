-- 115_feedback_question_bank_seed.sql
-- Seeds the question banks for player_voice and peer_observation feedback:
-- 8 rating-scale statements per audience (one per coaching category) plus
-- one free-text "anything else" question per audience. Reuses
-- assessment_type enum values that already exist (085) -- content only,
-- no schema change. See Task 1's implementer notes in the plan for why the
-- free-text question is its own assessment_questions row rather than a
-- feedback_responses column.

-- Player/Parent Voice (age_group required by age_group_only_for_player_voice)
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group, category_id) values
  ('player_voice', 'The coach explains things clearly.', 'rating_scale', 'all_ages', '15a429b6-eddc-4219-aec2-6b007f5f502a'),
  ('player_voice', 'The coach helps players improve their skills and technique.', 'rating_scale', 'all_ages', '7193c353-151a-4990-bc51-de1094d963da'),
  ('player_voice', 'The coach makes players feel confident and motivated to try their best.', 'rating_scale', 'all_ages', 'c819d09d-a5fd-46ca-bc1e-0da501bee511'),
  ('player_voice', 'The coach cares about players as people, not just as athletes.', 'rating_scale', 'all_ages', '4189dcc5-1837-453f-9a79-2d4364588047'),
  ('player_voice', 'The coach makes good decisions during games.', 'rating_scale', 'all_ages', 'da0bfe2f-1a13-428b-999c-08d6e611e681'),
  ('player_voice', 'The coach listens and communicates clearly.', 'rating_scale', 'all_ages', '8a537db6-f1b0-40fb-bc31-2a4486dda4e9'),
  ('player_voice', 'Training sessions feel well planned and organised.', 'rating_scale', 'all_ages', '49a67ac1-aedd-4b1b-9ea4-3fac73c90471'),
  ('player_voice', 'This feels like a good team to be part of.', 'rating_scale', 'all_ages', 'c54dd975-6b2e-4e32-8ac5-d89c518a4994'),
  ('player_voice', 'Is there anything else you''d like to share about your coach or the team?', 'free_text', 'all_ages', 'c54dd975-6b2e-4e32-8ac5-d89c518a4994');

-- Peer Observation (age_group must be null, not player_voice)
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group, category_id) values
  ('peer_observation', 'They break down technical concepts clearly for players.', 'rating_scale', null, '15a429b6-eddc-4219-aec2-6b007f5f502a'),
  ('peer_observation', 'They have strong technical/tactical coaching knowledge.', 'rating_scale', null, '7193c353-151a-4990-bc51-de1094d963da'),
  ('peer_observation', 'They get the best effort and energy out of players.', 'rating_scale', null, 'c819d09d-a5fd-46ca-bc1e-0da501bee511'),
  ('peer_observation', 'They focus on long-term player development, not just results.', 'rating_scale', null, '4189dcc5-1837-453f-9a79-2d4364588047'),
  ('peer_observation', 'They make sound tactical decisions under pressure.', 'rating_scale', null, 'da0bfe2f-1a13-428b-999c-08d6e611e681'),
  ('peer_observation', 'They communicate clearly and directly with players and staff.', 'rating_scale', null, '8a537db6-f1b0-40fb-bc31-2a4486dda4e9'),
  ('peer_observation', 'Their sessions are well planned and run efficiently.', 'rating_scale', null, '49a67ac1-aedd-4b1b-9ea4-3fac73c90471'),
  ('peer_observation', 'They build a positive, healthy team culture.', 'rating_scale', null, 'c54dd975-6b2e-4e32-8ac5-d89c518a4994'),
  ('peer_observation', 'Is there anything else you''d like to share about this coach?', 'free_text', null, 'c54dd975-6b2e-4e32-8ac5-d89c518a4994');
