-- 114_self_assessment_options_first_person_voice.sql
-- Rewords all 96 self-assessment answer options from third-person/instructional
-- voice ("Break down exactly what went wrong...") to first-person, absolutist
-- voice ("I always..." / "I never...") so each option reads as a personal
-- conviction ("this is me" / "this isn't me") rather than a recommended
-- coaching tactic. IDs and category_weights_json are untouched.

update public.assessment_options set option_text = 'I always stop and explain the why before we move on. Understanding beats repetition every time.' where id = 'b0000000-0000-0000-0000-000000000001';
update public.assessment_options set option_text = 'Talking about it can wait. I want them back on the field fixing the mechanics immediately.' where id = 'b0000000-0000-0000-0000-000000000002';
update public.assessment_options set option_text = 'I never dwell on a loss. If the group''s confidence has dipped, nothing else matters until that''s fixed.' where id = 'b0000000-0000-0000-0000-000000000003';
update public.assessment_options set option_text = 'One bad week doesn''t change my plan. I''m not reacting to short-term results.' where id = 'b0000000-0000-0000-0000-000000000004';

update public.assessment_options set option_text = 'My mind''s already on the next game. I''ll pick apart the tactical call later, not now.' where id = 'b0000000-0000-0000-0000-000000000005';
update public.assessment_options set option_text = 'I own the room in that moment. How I talk about it sets the tone for everyone else.' where id = 'b0000000-0000-0000-0000-000000000006';
update public.assessment_options set option_text = 'The result isn''t my job right now. Getting this team packed up and moving is.' where id = 'b0000000-0000-0000-0000-000000000007';
update public.assessment_options set option_text = 'I use raw moments like this to remind them what actually holds the group together.' where id = 'b0000000-0000-0000-0000-000000000008';

update public.assessment_options set option_text = 'I won''t let it go until they can explain back to me exactly why it happens.' where id = 'b0000000-0000-0000-0000-000000000009';
update public.assessment_options set option_text = 'I build a drill that forces the right read under real pressure. No amount of talking fixes that.' where id = 'b0000000-0000-0000-0000-000000000010';
update public.assessment_options set option_text = 'I take them aside and say it straight, no dressing it up.' where id = 'b0000000-0000-0000-0000-000000000011';
update public.assessment_options set option_text = 'This isn''t a one-conversation fix. I''m playing the long game with this player.' where id = 'b0000000-0000-0000-0000-000000000012';

update public.assessment_options set option_text = 'I hand them harder technical work. Bored players cause trouble, so I keep them stretched.' where id = 'b0000000-0000-0000-0000-000000000013';
update public.assessment_options set option_text = 'I always sit down and ask what''s really going on before I judge the behaviour.' where id = 'b0000000-0000-0000-0000-000000000014';
update public.assessment_options set option_text = 'I tighten the structure. Less unstructured time means less room for it to happen.' where id = 'b0000000-0000-0000-0000-000000000015';
update public.assessment_options set option_text = 'This isn''t a private chat. I make it about what the team stands for, every time.' where id = 'b0000000-0000-0000-0000-000000000016';

update public.assessment_options set option_text = 'I set hard technical benchmarks. Vague goals don''t move anyone.' where id = 'b0000000-0000-0000-0000-000000000017';
update public.assessment_options set option_text = 'I never set the season''s goals without asking the group what they actually want first.' where id = 'b0000000-0000-0000-0000-000000000018';
update public.assessment_options set option_text = 'The calendar and logistics get locked in now. I don''t leave that to chance.' where id = 'b0000000-0000-0000-0000-000000000019';
update public.assessment_options set option_text = 'Effort and enjoyment come first for me. Results follow, not the other way round.' where id = 'b0000000-0000-0000-0000-000000000020';

update public.assessment_options set option_text = 'I move it indoors without a second thought. Technical work doesn''t need grass.' where id = 'b0000000-0000-0000-0000-000000000021';
update public.assessment_options set option_text = 'I treat disruption as a live test. How the team adapts tells me more than any drill.' where id = 'b0000000-0000-0000-0000-000000000022';
update public.assessment_options set option_text = 'I rework the plan on the fly. I never let one bad session derail the bigger picture.' where id = 'b0000000-0000-0000-0000-000000000023';
update public.assessment_options set option_text = 'I keep it light and fun. A washed-out session is a mood problem, not a logistics one.' where id = 'b0000000-0000-0000-0000-000000000024';

update public.assessment_options set option_text = 'I slow everything down and check they''re actually following, every single time.' where id = 'b0000000-0000-0000-0000-000000000025';
update public.assessment_options set option_text = 'I always take the technical feedback one-on-one. Group settings aren''t for everyone.' where id = 'b0000000-0000-0000-0000-000000000026';
update public.assessment_options set option_text = 'I check in privately and gently. Some players need pulling out of their shell, not pushed.' where id = 'b0000000-0000-0000-0000-000000000027';
update public.assessment_options set option_text = 'I stop expecting the group format to work for them. I plan around them individually instead.' where id = 'b0000000-0000-0000-0000-000000000028';

update public.assessment_options set option_text = 'I go straight to the tape. I want to know exactly which calls made the difference.' where id = 'b0000000-0000-0000-0000-000000000029';
update public.assessment_options set option_text = 'I get the word out immediately. Players and parents deserve to hear how well this went.' where id = 'b0000000-0000-0000-0000-000000000030';
update public.assessment_options set option_text = 'Logistics first, always. Transport and the next fixture get sorted before anyone leaves.' where id = 'b0000000-0000-0000-0000-000000000031';
update public.assessment_options set option_text = 'I hold this up as proof. This is exactly what our culture is capable of.' where id = 'b0000000-0000-0000-0000-000000000032';

update public.assessment_options set option_text = 'I never leave it vague. I tell them precisely what their child needs to work on.' where id = 'b0000000-0000-0000-0000-000000000033';
update public.assessment_options set option_text = 'I explain the tactical thinking behind the selection. That''s the honest answer.' where id = 'b0000000-0000-0000-0000-000000000034';
update public.assessment_options set option_text = 'I hear them out fully before I say a word back.' where id = 'b0000000-0000-0000-0000-000000000035';
update public.assessment_options set option_text = 'I always reassure them it''s about effort and involvement, not just minutes on the field.' where id = 'b0000000-0000-0000-0000-000000000036';

update public.assessment_options set option_text = 'I sharpen the technical content. If training feels worth it, they show up.' where id = 'b0000000-0000-0000-0000-000000000037';
update public.assessment_options set option_text = 'I go straight to individuals and ask what would bring them back.' where id = 'b0000000-0000-0000-0000-000000000038';
update public.assessment_options set option_text = 'I check the schedule first. Timing and format are usually the real problem.' where id = 'b0000000-0000-0000-0000-000000000039';
update public.assessment_options set option_text = 'I talk to the whole group about what training actually means to this team.' where id = 'b0000000-0000-0000-0000-000000000040';

update public.assessment_options set option_text = 'I walk them through exactly what happened, every time, so it doesn''t repeat.' where id = 'b0000000-0000-0000-0000-000000000041';
update public.assessment_options set option_text = 'I talk it through with them directly and adjust the plan together, on the spot.' where id = 'b0000000-0000-0000-0000-000000000042';
update public.assessment_options set option_text = 'The rest of the session doesn''t stop for me. I handle it and keep everyone else moving.' where id = 'b0000000-0000-0000-0000-000000000043';
update public.assessment_options set option_text = 'I always check how they''re feeling about it, not just the physical side.' where id = 'b0000000-0000-0000-0000-000000000044';

update public.assessment_options set option_text = 'Next session, I build a drill that forces them to work together. No exceptions.' where id = 'b0000000-0000-0000-0000-000000000045';
update public.assessment_options set option_text = 'I manage it live: separate them, reset, keep control. That''s instinct, not a plan.' where id = 'b0000000-0000-0000-0000-000000000046';
update public.assessment_options set option_text = 'I never deal with this in the moment. I talk to both of them separately once it''s cooled.' where id = 'b0000000-0000-0000-0000-000000000047';
update public.assessment_options set option_text = 'I make it a whole-team moment. This is exactly what our standards are for.' where id = 'b0000000-0000-0000-0000-000000000048';

update public.assessment_options set option_text = 'I always break it into small steps first. Nobody tries it at pace until they understand it.' where id = 'b0000000-0000-0000-0000-000000000049';
update public.assessment_options set option_text = 'I frame it around the game straight away. Why it matters comes before how to do it.' where id = 'b0000000-0000-0000-0000-000000000050';
update public.assessment_options set option_text = 'I explain exactly why we''re doing this now. They deserve to know the reasoning.' where id = 'b0000000-0000-0000-0000-000000000051';
update public.assessment_options set option_text = 'I never expect this in one session. It''s a multi-week project from the start.' where id = 'b0000000-0000-0000-0000-000000000052';

update public.assessment_options set option_text = 'I go straight at the one technical weakness we''ve both already flagged.' where id = 'b0000000-0000-0000-0000-000000000053';
update public.assessment_options set option_text = 'I use the time to find out what''s really driving them to put in the extra work.' where id = 'b0000000-0000-0000-0000-000000000054';
update public.assessment_options set option_text = 'It goes straight into the calendar. I never let extras disrupt the rest of the plan.' where id = 'b0000000-0000-0000-0000-000000000055';
update public.assessment_options set option_text = 'I always frame it as one piece of a much longer plan for this player.' where id = 'b0000000-0000-0000-0000-000000000056';

update public.assessment_options set option_text = 'I go through what worked and didn''t tactically. That''s what actually matters to me.' where id = 'b0000000-0000-0000-0000-000000000057';
update public.assessment_options set option_text = 'I ask the group directly what they''d change. I''m not guessing on their behalf.' where id = 'b0000000-0000-0000-0000-000000000058';
update public.assessment_options set option_text = 'Presentations, sign-off, the logistics. I make sure those get handled properly.' where id = 'b0000000-0000-0000-0000-000000000059';
update public.assessment_options set option_text = 'I centre it on what we built together. That''s the part worth remembering.' where id = 'b0000000-0000-0000-0000-000000000060';

update public.assessment_options set option_text = 'I give them direct, clear coaching immediately. I won''t let them fall behind.' where id = 'b0000000-0000-0000-0000-000000000061';
update public.assessment_options set option_text = 'I slot them into a role that suits their strengths straight away.' where id = 'b0000000-0000-0000-0000-000000000062';
update public.assessment_options set option_text = 'I always have someone check in on how they''re settling, not just how they''re playing.' where id = 'b0000000-0000-0000-0000-000000000063';
update public.assessment_options set option_text = 'I make it my job to fold them into how this team already works.' where id = 'b0000000-0000-0000-0000-000000000064';

update public.assessment_options set option_text = 'I break down exactly what went wrong. Understanding it matters more than how they feel about it.' where id = 'b0000000-0000-0000-0000-000000000065';
update public.assessment_options set option_text = 'I go straight to reconnecting them with why they play in the first place.' where id = 'b0000000-0000-0000-0000-000000000066';
update public.assessment_options set option_text = 'I address the group honestly. No spin, just where things stand.' where id = 'b0000000-0000-0000-0000-000000000067';
update public.assessment_options set option_text = 'I always remind them what this team is about beyond the scoreboard.' where id = 'b0000000-0000-0000-0000-000000000068';

update public.assessment_options set option_text = 'I dial back the technical intensity straight away. That''s the first lever I pull.' where id = 'b0000000-0000-0000-0000-000000000069';
update public.assessment_options set option_text = 'I make the tactical calls in-game to protect them. That''s on me, not the schedule.' where id = 'b0000000-0000-0000-0000-000000000070';
update public.assessment_options set option_text = 'I rebuild the schedule to force in real recovery. No half measures.' where id = 'b0000000-0000-0000-0000-000000000071';
update public.assessment_options set option_text = 'I check how the group''s coping mentally first. The body follows the mind.' where id = 'b0000000-0000-0000-0000-000000000072';

update public.assessment_options set option_text = 'I set the technical standard we need to hit. Nothing less gets us there.' where id = 'b0000000-0000-0000-0000-000000000073';
update public.assessment_options set option_text = 'I build the game plan around exactly who we''ll face. Generic prep doesn''t cut it.' where id = 'b0000000-0000-0000-0000-000000000074';
update public.assessment_options set option_text = 'Travel, prep, timing. I get deliberate about all of it for the bigger occasion.' where id = 'b0000000-0000-0000-0000-000000000075';
update public.assessment_options set option_text = 'I keep the team grounded as the pressure builds. That''s my one job here.' where id = 'b0000000-0000-0000-0000-000000000076';

update public.assessment_options set option_text = 'I deal with it directly, calmly, after the game. Every time.' where id = 'b0000000-0000-0000-0000-000000000077';
update public.assessment_options set option_text = 'I use it to reinforce our standards on sideline behaviour, full stop.' where id = 'b0000000-0000-0000-0000-000000000078';
update public.assessment_options set option_text = 'I stay locked on my own calls. That gets addressed separately, later.' where id = 'b0000000-0000-0000-0000-000000000079';
update public.assessment_options set option_text = 'I flag it and manage it proactively before the next game. I don''t wait for it to happen again.' where id = 'b0000000-0000-0000-0000-000000000080';

update public.assessment_options set option_text = 'I make sure they''re crystal clear on the technical content first. Always.' where id = 'b0000000-0000-0000-0000-000000000081';
update public.assessment_options set option_text = 'I have the direct conversation about roles and expectations, out loud.' where id = 'b0000000-0000-0000-0000-000000000082';
update public.assessment_options set option_text = 'I set a clear structure for who runs what, every single week.' where id = 'b0000000-0000-0000-0000-000000000083';
update public.assessment_options set option_text = 'I bring them into shaping the culture, not just running drills.' where id = 'b0000000-0000-0000-0000-000000000084';

update public.assessment_options set option_text = 'I give them harder technical work. That''s how I re-engage talent.' where id = 'b0000000-0000-0000-0000-000000000085';
update public.assessment_options set option_text = 'I go straight to the conversation about what''s really behind it.' where id = 'b0000000-0000-0000-0000-000000000086';
update public.assessment_options set option_text = 'I think about what this means long-term for them, not just this week.' where id = 'b0000000-0000-0000-0000-000000000087';
update public.assessment_options set option_text = 'I make the standard clear to everyone: talent doesn''t buy you out of effort here.' where id = 'b0000000-0000-0000-0000-000000000088';

update public.assessment_options set option_text = 'I make the tactical calls. That''s what wins it, not noise.' where id = 'b0000000-0000-0000-0000-000000000089';
update public.assessment_options set option_text = 'I cut through with short, clear calls the players can actually act on.' where id = 'b0000000-0000-0000-0000-000000000090';
update public.assessment_options set option_text = 'I trust the technical habits we''ve drilled all season. That''s what holds up.' where id = 'b0000000-0000-0000-0000-000000000091';
update public.assessment_options set option_text = 'I lean on the composure we''ve built as a group all year.' where id = 'b0000000-0000-0000-0000-000000000092';

update public.assessment_options set option_text = 'Watching individual technique sharpen week on week. That''s what mattered to me.' where id = 'b0000000-0000-0000-0000-000000000093';
update public.assessment_options set option_text = 'Watching the team read the game better and make sharper calls under pressure.' where id = 'b0000000-0000-0000-0000-000000000094';
update public.assessment_options set option_text = 'Watching players grow as people, not just as players. That''s the whole point for me.' where id = 'b0000000-0000-0000-0000-000000000095';
update public.assessment_options set option_text = 'Knowing they actually wanted to turn up, week after week. That''s everything.' where id = 'b0000000-0000-0000-0000-000000000096';
