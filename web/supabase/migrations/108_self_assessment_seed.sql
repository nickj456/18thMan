-- 108_self_assessment_seed.sql
alter table public.assessment_questions
  add column display_order integer;

create index assessment_questions_display_order_idx
  on public.assessment_questions(display_order)
  where assessment_type = 'self_assessment';

insert into public.assessment_questions (id, assessment_type, question_text, question_format, active, version, display_order) values
  ('a0000000-0000-0000-0000-000000000001', 'self_assessment', 'You''re planning next week''s session after a scrappy loss.', 'scenario_choice', true, 1, 1),
  ('a0000000-0000-0000-0000-000000000002', 'self_assessment', 'A near-final-whistle penalty decision goes against you and the team is fuming in the changing room.', 'scenario_choice', true, 1, 2),
  ('a0000000-0000-0000-0000-000000000003', 'self_assessment', 'A player keeps making the same positional error in defence.', 'scenario_choice', true, 1, 3),
  ('a0000000-0000-0000-0000-000000000004', 'self_assessment', 'You''ve got a talented player who''s disruptive at training.', 'scenario_choice', true, 1, 4),
  ('a0000000-0000-0000-0000-000000000005', 'self_assessment', 'Pre-season, you''re setting goals for the year.', 'scenario_choice', true, 1, 5),
  ('a0000000-0000-0000-0000-000000000006', 'self_assessment', 'Weather turns bad mid-session and the ground is unplayable for your planned drills.', 'scenario_choice', true, 1, 6),
  ('a0000000-0000-0000-0000-000000000007', 'self_assessment', 'A quiet player never speaks up in team meetings.', 'scenario_choice', true, 1, 7),
  ('a0000000-0000-0000-0000-000000000008', 'self_assessment', 'You''ve just won a close match against a much stronger side.', 'scenario_choice', true, 1, 8),
  ('a0000000-0000-0000-0000-000000000009', 'self_assessment', 'A parent pulls you aside, unhappy their child isn''t getting more game time.', 'scenario_choice', true, 1, 9),
  ('a0000000-0000-0000-0000-000000000010', 'self_assessment', 'Training attendance has been dropping the last few weeks.', 'scenario_choice', true, 1, 10),
  ('a0000000-0000-0000-0000-000000000011', 'self_assessment', 'A player picks up a minor injury mid-session.', 'scenario_choice', true, 1, 11),
  ('a0000000-0000-0000-0000-000000000012', 'self_assessment', 'Two players clash during a drill and it nearly turns physical.', 'scenario_choice', true, 1, 12),
  ('a0000000-0000-0000-0000-000000000013', 'self_assessment', 'You''re introducing a brand new skill the team has never drilled before.', 'scenario_choice', true, 1, 13),
  ('a0000000-0000-0000-0000-000000000014', 'self_assessment', 'A player asks for extra one-on-one help outside normal training.', 'scenario_choice', true, 1, 14),
  ('a0000000-0000-0000-0000-000000000015', 'self_assessment', 'It''s the end of the season and you''re reflecting with the group.', 'scenario_choice', true, 1, 15),
  ('a0000000-0000-0000-0000-000000000016', 'self_assessment', 'A new player joins mid-season and doesn''t know anyone.', 'scenario_choice', true, 1, 16),
  ('a0000000-0000-0000-0000-000000000017', 'self_assessment', 'The team is flat and demoralised after a heavy loss.', 'scenario_choice', true, 1, 17),
  ('a0000000-0000-0000-0000-000000000018', 'self_assessment', 'Several players are visibly fatigued a few weeks into a heavy fixture run.', 'scenario_choice', true, 1, 18),
  ('a0000000-0000-0000-0000-000000000019', 'self_assessment', 'You''re planning for a finals campaign.', 'scenario_choice', true, 1, 19),
  ('a0000000-0000-0000-0000-000000000020', 'self_assessment', 'A parent is shouting instructions from the sideline during a game.', 'scenario_choice', true, 1, 20),
  ('a0000000-0000-0000-0000-000000000021', 'self_assessment', 'You want to delegate more to your assistant coaches this season.', 'scenario_choice', true, 1, 21),
  ('a0000000-0000-0000-0000-000000000022', 'self_assessment', 'A talented player isn''t trying hard in training.', 'scenario_choice', true, 1, 22),
  ('a0000000-0000-0000-0000-000000000023', 'self_assessment', 'You need to close out a tight game in the final minutes.', 'scenario_choice', true, 1, 23),
  ('a0000000-0000-0000-0000-000000000024', 'self_assessment', 'Looking back on the whole season, what mattered most to you?', 'scenario_choice', true, 1, 24);

insert into public.assessment_options (id, question_id, option_text, category_weights_json) values
  -- Q1
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Break down exactly what went wrong technically and drill it until it''s second nature.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Focus the session on a technical fix for the specific tackle-completion issue you spotted on video.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Keep the session upbeat and focus on what the team did well, to rebuild confidence first.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Use the loss as a long-term development marker, and plan the skill over the next month rather than this week.', '{"developer": 100}'),
  -- Q2
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Talk through the tactical options you had in that moment and what you''d call differently next time.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Address the room calmly, acknowledge the frustration, and set the tone for how you talk about it publicly.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Make sure the changing room is packed up and the bus is on schedule despite the delay.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Use the moment to reinforce how the team supports each other regardless of results.', '{"developer": 100}'),
  -- Q3
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Walk them through exactly why the error happens and what to look for next time.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'Bring in a specific drill built to correct their footwork on that read.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'Pull them aside and explain clearly, in plain language, what you need from them.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'Note it as a long-term project for them, not something to fix in one conversation.', '{"developer": 100}'),
  -- Q4
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004', 'Give them extra individual technical work to channel their energy.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 'Have a one-on-one about what''s driving the behaviour, not just the behaviour itself.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000004', 'Set a clear, consistent structure for the session so there''s less room for disruption.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000004', 'Frame it as a team standards conversation, not just a talk with them.', '{"culture-builder": 100}'),
  -- Q5
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000005', 'Set specific technical benchmarks the team should hit by mid-season.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000005', 'Ask the group what they want out of the season and build the plan around that together.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000005', 'Map out the training calendar and logistics for the whole block now.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000005', 'Focus goal-setting on effort and enjoyment rather than results.', '{"motivator": 100}'),
  -- Q6
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000006', 'Switch to a technical skills session you can run in the clubhouse or a smaller dry area.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000006', 'Use the disruption to test how the team adapts tactically under changed conditions.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000006', 'Adjust the session plan on the fly without losing much time.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000006', 'Keep spirits high and turn it into a fun, lower-stakes session.', '{"culture-builder": 100}'),
  -- Q7
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000007', 'Break your explanations down further to make sure they''re following, even if they don''t ask.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000007', 'Give them specific technical feedback one-on-one instead of only in the group.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000007', 'Check in privately about how they''re finding things and encourage them gently.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000007', 'Note their development needs individually rather than expecting the group format to work for them.', '{"developer": 100}'),
  -- Q8
  ('b0000000-0000-0000-0000-000000000029', 'a0000000-0000-0000-0000-000000000008', 'Talk through the tactical decisions that made the difference.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000008', 'Get the message out to players and parents about how well the team played.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000008', 'Make sure the post-match logistics (transport, next fixture info) are sorted before anyone leaves.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000008', 'Celebrate it as proof of what the team''s culture can achieve.', '{"culture-builder": 100}'),
  -- Q9
  ('b0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000009', 'Explain clearly and specifically what the player needs to work on to earn more minutes.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000009', 'Point to the tactical reasoning behind your team selection that day.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000009', 'Listen fully, then explain your reasoning calmly and respectfully.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000036', 'a0000000-0000-0000-0000-000000000009', 'Reassure them the club values effort and involvement for every player, not just game time.', '{"motivator": 100}'),
  -- Q10
  ('b0000000-0000-0000-0000-000000000037', 'a0000000-0000-0000-0000-000000000010', 'Bring in a more technically focused session to make attending feel more valuable.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000038', 'a0000000-0000-0000-0000-000000000010', 'Talk to a few players individually about what would get them back and adjust the plan for them.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000039', 'a0000000-0000-0000-0000-000000000010', 'Review the training schedule to see whether timing or format is part of the problem.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000010', 'Talk to the group about what training means to the team, not just to results.', '{"culture-builder": 100}'),
  -- Q11
  ('b0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000011', 'Walk them through exactly what happened and how to avoid it next time.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000011', 'Adjust their individual training plan around the injury for the coming weeks.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000011', 'Make sure the session keeps running smoothly for everyone else while it''s dealt with.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000011', 'Check in on how they''re feeling about it, not just the injury itself.', '{"motivator": 100}'),
  -- Q12
  ('b0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000012', 'Bring in a specific technical drill next session that requires them to work together.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000012', 'Manage the moment tactically: separate them, reset the drill, keep control.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000012', 'Talk to both individually about what''s really going on between them.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000012', 'Use it to reinforce what the team stands for and how conflict gets handled.', '{"culture-builder": 100}'),
  -- Q13
  ('b0000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000013', 'Break it down into small, teachable steps before trying it at pace.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000050', 'a0000000-0000-0000-0000-000000000013', 'Bring in the tactical context for when and why the skill matters in a game.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-000000000013', 'Explain clearly why you''re introducing it now and what you expect from it.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000052', 'a0000000-0000-0000-0000-000000000013', 'Treat it as a multi-week development project, not a one-session fix.', '{"developer": 100}'),
  -- Q14
  ('b0000000-0000-0000-0000-000000000053', 'a0000000-0000-0000-0000-000000000014', 'Focus the extra session on a specific technical weakness you''ve both identified.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000054', 'a0000000-0000-0000-0000-000000000014', 'Use it to figure out what''s really motivating them to put in the extra work.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000055', 'a0000000-0000-0000-0000-000000000014', 'Fit it into the training calendar without disrupting anything else.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000056', 'a0000000-0000-0000-0000-000000000014', 'Frame it as part of their long-term development plan.', '{"developer": 100}'),
  -- Q15
  ('b0000000-0000-0000-0000-000000000057', 'a0000000-0000-0000-0000-000000000015', 'Talk through what worked and didn''t work about the tactical approach this year.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000058', 'a0000000-0000-0000-0000-000000000015', 'Ask the group directly what they''d want to change next year.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000059', 'a0000000-0000-0000-0000-000000000015', 'Make sure the end-of-season logistics (presentations, sign-off) are handled well.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000060', 'a0000000-0000-0000-0000-000000000015', 'Focus the conversation on what the team built together this year.', '{"motivator": 100}'),
  -- Q16
  ('b0000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-000000000016', 'Give them clear, direct technical coaching so they''re not left behind.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000062', 'a0000000-0000-0000-0000-000000000016', 'Pair them with a specific tactical role suited to their strengths right away.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000063', 'a0000000-0000-0000-0000-000000000016', 'Have someone check in on how they''re settling in, not just how they''re playing.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000064', 'a0000000-0000-0000-0000-000000000016', 'Make an effort to fold them into the team''s existing culture and habits.', '{"culture-builder": 100}'),
  -- Q17
  ('b0000000-0000-0000-0000-000000000065', 'a0000000-0000-0000-0000-000000000017', 'Break down specifically what went wrong so they understand it, not just feel bad about it.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000066', 'a0000000-0000-0000-0000-000000000017', 'Talk to them about why it matters and reconnect them to why they play.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000067', 'a0000000-0000-0000-0000-000000000017', 'Address the group directly and honestly about where things stand.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000068', 'a0000000-0000-0000-0000-000000000017', 'Remind them what the team is about beyond just results.', '{"culture-builder": 100}'),
  -- Q18
  ('b0000000-0000-0000-0000-000000000069', 'a0000000-0000-0000-0000-000000000018', 'Adjust the technical intensity of sessions to manage load.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000070', 'a0000000-0000-0000-0000-000000000018', 'Make tactical changes to protect tired players in games.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000071', 'a0000000-0000-0000-0000-000000000018', 'Restructure the training schedule to build in recovery.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000072', 'a0000000-0000-0000-0000-000000000018', 'Check in on how the group''s coping, not just their bodies.', '{"motivator": 100}'),
  -- Q19
  ('b0000000-0000-0000-0000-000000000073', 'a0000000-0000-0000-0000-000000000019', 'Set out the technical standards the team needs to hit to compete at that level.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000074', 'a0000000-0000-0000-0000-000000000019', 'Build the tactical game plan specifically for the sides you''ll likely face.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000075', 'a0000000-0000-0000-0000-000000000019', 'Get very deliberate about logistics like travel, prep, and timing for the bigger occasion.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000076', 'a0000000-0000-0000-0000-000000000019', 'Focus on keeping the team grounded and connected under the extra pressure.', '{"developer": 100}'),
  -- Q20
  ('b0000000-0000-0000-0000-000000000077', 'a0000000-0000-0000-0000-000000000020', 'Have a clear, calm conversation with them about it after the game.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000078', 'a0000000-0000-0000-0000-000000000020', 'Use it as a moment to reinforce the team''s standards around sideline behaviour.', '{"culture-builder": 100}'),
  ('b0000000-0000-0000-0000-000000000079', 'a0000000-0000-0000-0000-000000000020', 'Stay focused on your own tactical calls and address it separately later.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000080', 'a0000000-0000-0000-0000-000000000020', 'Note it as something to manage proactively before the next game.', '{"organiser": 100}'),
  -- Q21
  ('b0000000-0000-0000-0000-000000000081', 'a0000000-0000-0000-0000-000000000021', 'Make sure they''re clear on the technical content you want delivered.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000082', 'a0000000-0000-0000-0000-000000000021', 'Have a direct conversation about roles and expectations.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000083', 'a0000000-0000-0000-0000-000000000021', 'Set up a clear structure for who runs what each week.', '{"organiser": 100}'),
  ('b0000000-0000-0000-0000-000000000084', 'a0000000-0000-0000-0000-000000000021', 'Involve them in shaping the team''s culture, not just running drills.', '{"culture-builder": 100}'),
  -- Q22
  ('b0000000-0000-0000-0000-000000000085', 'a0000000-0000-0000-0000-000000000022', 'Give them more technically demanding work to re-engage them.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000086', 'a0000000-0000-0000-0000-000000000022', 'Have a conversation about what''s behind the lack of effort.', '{"motivator": 100}'),
  ('b0000000-0000-0000-0000-000000000087', 'a0000000-0000-0000-0000-000000000022', 'Think about what this means for their development long-term, not just this week.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000088', 'a0000000-0000-0000-0000-000000000022', 'Reinforce what effort means to the team, regardless of talent.', '{"culture-builder": 100}'),
  -- Q23
  ('b0000000-0000-0000-0000-000000000089', 'a0000000-0000-0000-0000-000000000023', 'Make the tactical calls needed to see the game out.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000090', 'a0000000-0000-0000-0000-000000000023', 'Get the message to players clearly and calmly amid the noise.', '{"communicator": 100}'),
  ('b0000000-0000-0000-0000-000000000091', 'a0000000-0000-0000-0000-000000000023', 'Trust the technical habits you''ve drilled all season to hold up.', '{"teacher": 100}'),
  ('b0000000-0000-0000-0000-000000000092', 'a0000000-0000-0000-0000-000000000023', 'Lean on the team''s composure and trust in each other.', '{"culture-builder": 100}'),
  -- Q24
  ('b0000000-0000-0000-0000-000000000093', 'a0000000-0000-0000-0000-000000000024', 'Seeing individual players'' skills improve technically.', '{"technician": 100}'),
  ('b0000000-0000-0000-0000-000000000094', 'a0000000-0000-0000-0000-000000000024', 'Seeing the team make smarter decisions on the field.', '{"game-manager": 100}'),
  ('b0000000-0000-0000-0000-000000000095', 'a0000000-0000-0000-0000-000000000024', 'Seeing players grow and develop as people, not just players.', '{"developer": 100}'),
  ('b0000000-0000-0000-0000-000000000096', 'a0000000-0000-0000-0000-000000000024', 'Seeing the team become a place players wanted to be.', '{"culture-builder": 100}');
