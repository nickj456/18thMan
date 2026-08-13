-- 117_feedback_question_bank_display_order.sql
-- Migration 108 added assessment_questions.display_order and populated it for
-- the self-assessment questions. Migration 115 seeded 18 player_voice /
-- peer_observation rows (8 rating-scale statements + 1 free-text question per
-- assessment_type) but left display_order null, so their render order is
-- unstable. Migration 115 used gen_random_uuid() for row ids (not fixed
-- UUIDs), so rows here are matched by assessment_type + question_text rather
-- than id.
--
-- Order follows the design spec's coaching-category table: Teacher,
-- Technician, Motivator, Developer, Game Manager, Communicator, Organiser,
-- Culture Builder (1-8), then the free-text "anything else" question (9).

-- Player/Parent Voice
update public.assessment_questions set display_order = 1
  where assessment_type = 'player_voice' and question_text = 'The coach explains things clearly.';
update public.assessment_questions set display_order = 2
  where assessment_type = 'player_voice' and question_text = 'The coach helps players improve their skills and technique.';
update public.assessment_questions set display_order = 3
  where assessment_type = 'player_voice' and question_text = 'The coach makes players feel confident and motivated to try their best.';
update public.assessment_questions set display_order = 4
  where assessment_type = 'player_voice' and question_text = 'The coach cares about players as people, not just as athletes.';
update public.assessment_questions set display_order = 5
  where assessment_type = 'player_voice' and question_text = 'The coach makes good decisions during games.';
update public.assessment_questions set display_order = 6
  where assessment_type = 'player_voice' and question_text = 'The coach listens and communicates clearly.';
update public.assessment_questions set display_order = 7
  where assessment_type = 'player_voice' and question_text = 'Training sessions feel well planned and organised.';
update public.assessment_questions set display_order = 8
  where assessment_type = 'player_voice' and question_text = 'This feels like a good team to be part of.';
update public.assessment_questions set display_order = 9
  where assessment_type = 'player_voice' and question_text = 'Is there anything else you''d like to share about your coach or the team?';

-- Peer Observation
update public.assessment_questions set display_order = 1
  where assessment_type = 'peer_observation' and question_text = 'They break down technical concepts clearly for players.';
update public.assessment_questions set display_order = 2
  where assessment_type = 'peer_observation' and question_text = 'They have strong technical/tactical coaching knowledge.';
update public.assessment_questions set display_order = 3
  where assessment_type = 'peer_observation' and question_text = 'They get the best effort and energy out of players.';
update public.assessment_questions set display_order = 4
  where assessment_type = 'peer_observation' and question_text = 'They focus on long-term player development, not just results.';
update public.assessment_questions set display_order = 5
  where assessment_type = 'peer_observation' and question_text = 'They make sound tactical decisions under pressure.';
update public.assessment_questions set display_order = 6
  where assessment_type = 'peer_observation' and question_text = 'They communicate clearly and directly with players and staff.';
update public.assessment_questions set display_order = 7
  where assessment_type = 'peer_observation' and question_text = 'Their sessions are well planned and run efficiently.';
update public.assessment_questions set display_order = 8
  where assessment_type = 'peer_observation' and question_text = 'They build a positive, healthy team culture.';
update public.assessment_questions set display_order = 9
  where assessment_type = 'peer_observation' and question_text = 'Is there anything else you''d like to share about this coach?';
