-- 113_self_assessment_reword_remaining_options.sql
-- Migration 112 reworded 83 of the 96 self-assessment options; these 13 were
-- missed (left byte-identical to the original seed text) and are reworded
-- here to complete the differentiation pass. IDs and category_weights_json
-- are untouched, only option_text changes.

update public.assessment_options set option_text = 'Break the moment down calmly: what led to it, and exactly what to change so it doesn''t happen again.' where id = 'b0000000-0000-0000-0000-000000000041';
update public.assessment_options set option_text = 'Set it aside as a longer conversation. Pull each of them aside separately once things have cooled off.' where id = 'b0000000-0000-0000-0000-000000000047';
update public.assessment_options set option_text = 'Make it a moment for the whole group: this is exactly what the team''s standards are for.' where id = 'b0000000-0000-0000-0000-000000000048';
update public.assessment_options set option_text = 'Assign someone to check on them personally over the next few weeks, not just track their form.' where id = 'b0000000-0000-0000-0000-000000000063';
update public.assessment_options set option_text = 'Walk through the tape and make sure every player understands exactly what happened, not just that it hurt.' where id = 'b0000000-0000-0000-0000-000000000065';
update public.assessment_options set option_text = 'Call it straight in the room: no spin, just where things actually stand right now.' where id = 'b0000000-0000-0000-0000-000000000067';
update public.assessment_options set option_text = 'Sit down one on one and agree exactly who owns what, out loud, not left implied.' where id = 'b0000000-0000-0000-0000-000000000082';
update public.assessment_options set option_text = 'Make the standard clear to the whole group: talent doesn''t buy you out of effort here.' where id = 'b0000000-0000-0000-0000-000000000088';
update public.assessment_options set option_text = 'Cut through the noise with short, clear calls the players can actually hear and act on.' where id = 'b0000000-0000-0000-0000-000000000090';
update public.assessment_options set option_text = 'Trust the calm you''ve built as a group all season to hold under pressure.' where id = 'b0000000-0000-0000-0000-000000000092';
update public.assessment_options set option_text = 'Watching individual technique sharpen week on week.' where id = 'b0000000-0000-0000-0000-000000000093';
update public.assessment_options set option_text = 'Watching the team read the game better and make sharper calls under pressure.' where id = 'b0000000-0000-0000-0000-000000000094';
update public.assessment_options set option_text = 'Knowing the players actually wanted to turn up, week after week.' where id = 'b0000000-0000-0000-0000-000000000096';
