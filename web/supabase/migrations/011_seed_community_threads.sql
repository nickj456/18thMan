-- Seed starter community threads
-- Uses the first admin account, falling back to the first coach account
do $$
declare
  v_author uuid;
begin
  -- Find first admin, then fall back to first coach
  select id into v_author
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if v_author is null then
    select id into v_author
    from public.profiles
    where role = 'coach'
    order by created_at
    limit 1;
  end if;

  if v_author is null then
    raise notice 'No admin or coach account found — skipping community thread seed';
    return;
  end if;

  -- Only seed if no community threads exist yet
  if exists (select 1 from public.conversations where type = 'community') then
    raise notice 'Community threads already exist — skipping seed';
    return;
  end if;

  insert into public.conversations (type, created_by, title) values
    ('community', v_author, 'What''s your go-to pre-season conditioning session?'),
    ('community', v_author, 'Defensive line speed — how do you coach it at junior level?'),
    ('community', v_author, 'Best drills for dummy half service under pressure'),
    ('community', v_author, 'How are you keeping players engaged during the off-season?'),
    ('community', v_author, 'Set plays off a scrum — what''s working for your team?'),
    ('community', v_author, 'Coaching the offload — technique tips and progressions'),
    ('community', v_author, 'Managing parent expectations at junior club level'),
    ('community', v_author, 'Video analysis tools — what are you using?');

  raise notice 'Community threads seeded successfully';
end;
$$;
