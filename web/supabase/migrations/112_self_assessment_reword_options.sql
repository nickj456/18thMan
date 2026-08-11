-- 112_self_assessment_reword_options.sql
-- Rewords all 96 self-assessment answer options so each question's 4 options
-- represent distinct, instinctive coaching behaviors instead of 4 generically
-- "reasonable" responses. IDs and category_weights_json are untouched.

update public.assessment_options set option_text = 'Sit the team down and walk through the game frame by frame so everyone understands why it went wrong.' where id = 'b0000000-0000-0000-0000-000000000001';
update public.assessment_options set option_text = 'Skip the debrief. Go straight to the training ground and rebuild the exact technique that broke down.' where id = 'b0000000-0000-0000-0000-000000000002';
update public.assessment_options set option_text = 'Lead with what went right. A flat, defeated team won''t fix anything, confidence comes first.' where id = 'b0000000-0000-0000-0000-000000000003';
update public.assessment_options set option_text = 'Don''t overreact to one bad week. File it as a marker and keep the long-term plan on track.' where id = 'b0000000-0000-0000-0000-000000000004';

update public.assessment_options set option_text = 'Walk the team through the tactical calls you''d make differently next time. The ref''s gone, the game reading hasn''t.' where id = 'b0000000-0000-0000-0000-000000000005';
update public.assessment_options set option_text = 'Get in front of the room now, own the moment, and set the tone for how this gets talked about.' where id = 'b0000000-0000-0000-0000-000000000006';
update public.assessment_options set option_text = 'Ignore the noise for a minute. Get the kit packed and the bus moving on schedule.' where id = 'b0000000-0000-0000-0000-000000000007';
update public.assessment_options set option_text = 'Use the anger as fuel for a bigger point: how the group backs each other no matter the result.' where id = 'b0000000-0000-0000-0000-000000000008';

update public.assessment_options set option_text = 'Sit them down and explain exactly why the error keeps happening, step by step.' where id = 'b0000000-0000-0000-0000-000000000009';
update public.assessment_options set option_text = 'Design a drill that forces the correct read under matchlike pressure.' where id = 'b0000000-0000-0000-0000-000000000010';
update public.assessment_options set option_text = 'Pull them aside, one on one, and tell them plainly what you need to see.' where id = 'b0000000-0000-0000-0000-000000000011';
update public.assessment_options set option_text = 'Log it as a long-term project. This isn''t a one-conversation fix.' where id = 'b0000000-0000-0000-0000-000000000012';

update public.assessment_options set option_text = 'Load them up with individual technical work. Channel the energy into something specific.' where id = 'b0000000-0000-0000-0000-000000000013';
update public.assessment_options set option_text = 'Sit down with them and dig into what''s actually driving the behaviour.' where id = 'b0000000-0000-0000-0000-000000000014';
update public.assessment_options set option_text = 'Tighten the session structure so there''s less space for it to happen.' where id = 'b0000000-0000-0000-0000-000000000015';
update public.assessment_options set option_text = 'Make it a team-standards conversation, not a private one. This is about what the group tolerates.' where id = 'b0000000-0000-0000-0000-000000000016';

update public.assessment_options set option_text = 'Set hard technical benchmarks the team needs to hit by mid-season.' where id = 'b0000000-0000-0000-0000-000000000017';
update public.assessment_options set option_text = 'Ask the group what they actually want this year, and build the plan around their answer.' where id = 'b0000000-0000-0000-0000-000000000018';
update public.assessment_options set option_text = 'Map the whole training calendar and logistics for the block right now.' where id = 'b0000000-0000-0000-0000-000000000019';
update public.assessment_options set option_text = 'Make the goals about effort and enjoyment, not results.' where id = 'b0000000-0000-0000-0000-000000000020';

update public.assessment_options set option_text = 'Move it indoors and turn it into a pure technical skills session.' where id = 'b0000000-0000-0000-0000-000000000021';
update public.assessment_options set option_text = 'Use the disruption as a live test of how the team adapts under changed conditions.' where id = 'b0000000-0000-0000-0000-000000000022';
update public.assessment_options set option_text = 'Rework the plan on the fly without losing the thread of what the week was building toward.' where id = 'b0000000-0000-0000-0000-000000000023';
update public.assessment_options set option_text = 'Turn it into a fun, low-stakes session and keep the mood light.' where id = 'b0000000-0000-0000-0000-000000000024';

update public.assessment_options set option_text = 'Slow your explanations down and check they''re following, even if they never ask.' where id = 'b0000000-0000-0000-0000-000000000025';
update public.assessment_options set option_text = 'Give them technical feedback one on one, away from the group.' where id = 'b0000000-0000-0000-0000-000000000026';
update public.assessment_options set option_text = 'Check in privately on how they''re finding things, and encourage them gently.' where id = 'b0000000-0000-0000-0000-000000000027';
update public.assessment_options set option_text = 'Accept the group format won''t reach them. Plan for their needs individually.' where id = 'b0000000-0000-0000-0000-000000000028';

update public.assessment_options set option_text = 'Break down exactly which tactical calls made the difference.' where id = 'b0000000-0000-0000-0000-000000000029';
update public.assessment_options set option_text = 'Get the word out to players and parents about how well the team played.' where id = 'b0000000-0000-0000-0000-000000000030';
update public.assessment_options set option_text = 'Lock down the post-match logistics, transport, next fixture, before anyone leaves.' where id = 'b0000000-0000-0000-0000-000000000031';
update public.assessment_options set option_text = 'Hold it up as proof of what the team''s culture can produce.' where id = 'b0000000-0000-0000-0000-000000000032';

update public.assessment_options set option_text = 'Spell out specifically what their child needs to work on to earn more minutes.' where id = 'b0000000-0000-0000-0000-000000000033';
update public.assessment_options set option_text = 'Explain the tactical reasoning behind the selection that day.' where id = 'b0000000-0000-0000-0000-000000000034';
update public.assessment_options set option_text = 'Hear them out fully first, then explain your reasoning calmly.' where id = 'b0000000-0000-0000-0000-000000000035';
update public.assessment_options set option_text = 'Reassure them the club values effort and involvement, not just game time.' where id = 'b0000000-0000-0000-0000-000000000036';

update public.assessment_options set option_text = 'Sharpen the technical content so showing up feels worth it.' where id = 'b0000000-0000-0000-0000-000000000037';
update public.assessment_options set option_text = 'Talk to a few players one on one about what would bring them back.' where id = 'b0000000-0000-0000-0000-000000000038';
update public.assessment_options set option_text = 'Check whether the timing or format of training is the actual problem.' where id = 'b0000000-0000-0000-0000-000000000039';
update public.assessment_options set option_text = 'Talk to the group about what training means to the team, not just the results it produces.' where id = 'b0000000-0000-0000-0000-000000000040';

update public.assessment_options set option_text = 'Walk them through exactly what happened and how to avoid it next time.' where id = 'b0000000-0000-0000-0000-000000000041';
update public.assessment_options set option_text = 'Talk it through with them directly and adjust their plan together.' where id = 'b0000000-0000-0000-0000-000000000042';
update public.assessment_options set option_text = 'Keep the rest of the session running smoothly while it''s dealt with.' where id = 'b0000000-0000-0000-0000-000000000043';
update public.assessment_options set option_text = 'Check in on how they''re feeling about it, not just the physical side.' where id = 'b0000000-0000-0000-0000-000000000044';

update public.assessment_options set option_text = 'Set a technical drill next session that forces them to work together.' where id = 'b0000000-0000-0000-0000-000000000045';
update public.assessment_options set option_text = 'Manage the moment live: separate them, reset the drill, keep control.' where id = 'b0000000-0000-0000-0000-000000000046';
update public.assessment_options set option_text = 'Talk to both individually about what''s really going on between them.' where id = 'b0000000-0000-0000-0000-000000000047';
update public.assessment_options set option_text = 'Use it to reinforce what the team stands for and how conflict gets handled.' where id = 'b0000000-0000-0000-0000-000000000048';

update public.assessment_options set option_text = 'Break it into small, teachable steps before anyone tries it at pace.' where id = 'b0000000-0000-0000-0000-000000000049';
update public.assessment_options set option_text = 'Frame it around when and why it matters in a real game.' where id = 'b0000000-0000-0000-0000-000000000050';
update public.assessment_options set option_text = 'Explain clearly why you''re introducing it now and what you expect.' where id = 'b0000000-0000-0000-0000-000000000051';
update public.assessment_options set option_text = 'Treat it as a multi-week project, not something to nail in one session.' where id = 'b0000000-0000-0000-0000-000000000052';

update public.assessment_options set option_text = 'Point the extra time at one specific technical weakness you''ve both flagged.' where id = 'b0000000-0000-0000-0000-000000000053';
update public.assessment_options set option_text = 'Use it to find out what''s really driving them to put in the extra work.' where id = 'b0000000-0000-0000-0000-000000000054';
update public.assessment_options set option_text = 'Slot it into the calendar without disrupting anything else.' where id = 'b0000000-0000-0000-0000-000000000055';
update public.assessment_options set option_text = 'Frame it as one piece of their longer development plan.' where id = 'b0000000-0000-0000-0000-000000000056';

update public.assessment_options set option_text = 'Go through what worked and didn''t tactically this year.' where id = 'b0000000-0000-0000-0000-000000000057';
update public.assessment_options set option_text = 'Ask the group directly what they''d change next year.' where id = 'b0000000-0000-0000-0000-000000000058';
update public.assessment_options set option_text = 'Get the logistics, presentations, sign-off, handled properly.' where id = 'b0000000-0000-0000-0000-000000000059';
update public.assessment_options set option_text = 'Centre the conversation on what the team built together.' where id = 'b0000000-0000-0000-0000-000000000060';

update public.assessment_options set option_text = 'Give them direct, clear coaching so they''re not left behind.' where id = 'b0000000-0000-0000-0000-000000000061';
update public.assessment_options set option_text = 'Slot them into a tactical role that suits their strengths right away.' where id = 'b0000000-0000-0000-0000-000000000062';
update public.assessment_options set option_text = 'Have someone check in on how they''re settling in, not just how they''re playing.' where id = 'b0000000-0000-0000-0000-000000000063';
update public.assessment_options set option_text = 'Make a real effort to fold them into the team''s existing habits and culture.' where id = 'b0000000-0000-0000-0000-000000000064';

update public.assessment_options set option_text = 'Break down specifically what went wrong so they understand it, not just feel bad about it.' where id = 'b0000000-0000-0000-0000-000000000065';
update public.assessment_options set option_text = 'Reconnect them to why they play in the first place.' where id = 'b0000000-0000-0000-0000-000000000066';
update public.assessment_options set option_text = 'Address the group directly and honestly about where things stand.' where id = 'b0000000-0000-0000-0000-000000000067';
update public.assessment_options set option_text = 'Remind them what the team is about beyond the scoreboard.' where id = 'b0000000-0000-0000-0000-000000000068';

update public.assessment_options set option_text = 'Dial back the technical intensity to manage the load.' where id = 'b0000000-0000-0000-0000-000000000069';
update public.assessment_options set option_text = 'Make in-game tactical calls that protect the tired players.' where id = 'b0000000-0000-0000-0000-000000000070';
update public.assessment_options set option_text = 'Rebuild the schedule to force in real recovery.' where id = 'b0000000-0000-0000-0000-000000000071';
update public.assessment_options set option_text = 'Check in on how the group''s coping mentally, not just physically.' where id = 'b0000000-0000-0000-0000-000000000072';

update public.assessment_options set option_text = 'Set the technical standards the team needs to hit to compete at that level.' where id = 'b0000000-0000-0000-0000-000000000073';
update public.assessment_options set option_text = 'Build a tactical game plan specifically around who you''ll face.' where id = 'b0000000-0000-0000-0000-000000000074';
update public.assessment_options set option_text = 'Get deliberate about travel, prep, and timing for the bigger occasion.' where id = 'b0000000-0000-0000-0000-000000000075';
update public.assessment_options set option_text = 'Keep the team grounded and connected as the pressure ramps up.' where id = 'b0000000-0000-0000-0000-000000000076';

update public.assessment_options set option_text = 'Have a calm, direct conversation with them after the game.' where id = 'b0000000-0000-0000-0000-000000000077';
update public.assessment_options set option_text = 'Use it to reinforce the team''s standards on sideline behaviour.' where id = 'b0000000-0000-0000-0000-000000000078';
update public.assessment_options set option_text = 'Stay locked on your own tactical calls and deal with it separately, later.' where id = 'b0000000-0000-0000-0000-000000000079';
update public.assessment_options set option_text = 'Flag it as something to manage proactively before the next game.' where id = 'b0000000-0000-0000-0000-000000000080';

update public.assessment_options set option_text = 'Make sure they''re crystal clear on the technical content you want delivered.' where id = 'b0000000-0000-0000-0000-000000000081';
update public.assessment_options set option_text = 'Have a direct conversation about roles and expectations.' where id = 'b0000000-0000-0000-0000-000000000082';
update public.assessment_options set option_text = 'Set up a clear structure for who runs what, every week.' where id = 'b0000000-0000-0000-0000-000000000083';
update public.assessment_options set option_text = 'Bring them into shaping the team''s culture, not just running drills.' where id = 'b0000000-0000-0000-0000-000000000084';

update public.assessment_options set option_text = 'Give them harder technical work to re-engage them.' where id = 'b0000000-0000-0000-0000-000000000085';
update public.assessment_options set option_text = 'Have a conversation about what''s actually behind the lack of effort.' where id = 'b0000000-0000-0000-0000-000000000086';
update public.assessment_options set option_text = 'Think about what this means for them long-term, not just this week.' where id = 'b0000000-0000-0000-0000-000000000087';
update public.assessment_options set option_text = 'Reinforce what effort means to the team, regardless of talent.' where id = 'b0000000-0000-0000-0000-000000000088';

update public.assessment_options set option_text = 'Make the tactical calls needed to see it out.' where id = 'b0000000-0000-0000-0000-000000000089';
update public.assessment_options set option_text = 'Get the message to players clearly and calmly amid the noise.' where id = 'b0000000-0000-0000-0000-000000000090';
update public.assessment_options set option_text = 'Trust the technical habits you''ve drilled in all season to hold up.' where id = 'b0000000-0000-0000-0000-000000000091';
update public.assessment_options set option_text = 'Lean on the team''s composure and trust in each other.' where id = 'b0000000-0000-0000-0000-000000000092';

update public.assessment_options set option_text = 'Seeing individual players'' skills improve technically.' where id = 'b0000000-0000-0000-0000-000000000093';
update public.assessment_options set option_text = 'Seeing the team make smarter decisions on the field.' where id = 'b0000000-0000-0000-0000-000000000094';
update public.assessment_options set option_text = 'Seeing players grow as people, not just as players.' where id = 'b0000000-0000-0000-0000-000000000095';
update public.assessment_options set option_text = 'Seeing the team become a place players wanted to be.' where id = 'b0000000-0000-0000-0000-000000000096';
