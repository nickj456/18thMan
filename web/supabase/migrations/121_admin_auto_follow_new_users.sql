-- Nick Johnson's account auto-follows every new coach on signup, and backfills
-- follows for everyone who already signed up. Runs from the profiles insert
-- trigger (fired by handle_new_user), so it's always well within the 60-minute
-- window — there's no delay to account for.
create or replace function public.auto_follow_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  admin_id uuid := '4ca91c4a-cf1a-4255-bfc4-f1e8640174a9';
begin
  if new.id <> admin_id then
    insert into public.follows (follower_id, following_id)
    values (admin_id, new.id)
    on conflict do nothing;

    insert into public.notifications (user_id, type, actor_id, data)
    values (
      new.id,
      'followed_you',
      admin_id,
      jsonb_build_object(
        'follower_id', admin_id,
        'follower_display_name', 'Nick Johnson',
        'follower_username', 'nick.johnsonn'
      )
    );
  end if;
  return new;
end;
$$;

create trigger on_profile_created_auto_follow
  after insert on public.profiles
  for each row execute procedure public.auto_follow_new_user();

-- Backfill: follow everyone who signed up before this migration ran.
insert into public.follows (follower_id, following_id)
select '4ca91c4a-cf1a-4255-bfc4-f1e8640174a9', id
from public.profiles
where id <> '4ca91c4a-cf1a-4255-bfc4-f1e8640174a9'
on conflict do nothing;
