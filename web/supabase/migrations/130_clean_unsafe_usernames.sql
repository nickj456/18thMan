-- Clean up usernames that broke /profile/[username] URLs and leaked email addresses.
--
-- Signup only enforced the username pattern in the browser, so a few accounts were
-- created with surrounding whitespace ("Coach ") or their email address as a username
-- (which was then shown on their public profile and listed in sitemap.xml).
-- Signup now validates server-side (src/lib/username.ts); this fixes existing rows:
--   "Coach "            -> "Coach"
--   "Sam@club.example"  -> "sam"
--
-- A rename only happens when the result is a clean URL segment and nobody else has,
-- or is about to get, the same name ignoring case — so it never trips the unique
-- constraint, never creates a "Sam"/"sam" lookalike pair, and is safe to re-run.
-- Anything skipped is reported by the notice at the end for an admin to resolve.

create temp table username_renames as
with candidates as (
  select
    id,
    username as old_username,
    case
      when username like '%@%' then lower(split_part(regexp_replace(username, '^[[:space:] ]+|[[:space:] ]+$', '', 'g'), '@', 1))
      else regexp_replace(username, '^[[:space:] ]+|[[:space:] ]+$', '', 'g')
    end as new_username
  from public.profiles
  where username <> regexp_replace(username, '^[[:space:] ]+|[[:space:] ]+$', '', 'g') or username like '%@%'
)
select c.*
from candidates c
where c.new_username ~ '^[A-Za-z0-9._-]{1,32}$'
  and c.new_username !~ '^\.+$'
  and not exists (
    select 1 from public.profiles o
    where o.id <> c.id and lower(o.username) = lower(c.new_username)
  )
  and not exists (
    select 1 from candidates o
    where o.id <> c.id and lower(o.new_username) = lower(c.new_username)
  );

update public.profiles p
set username = r.new_username
from username_renames r
where p.id = r.id;

-- Notifications copy the actor's username into their payload, both for links
-- (follower_username, sender_username, author_username) and as the display-name
-- fallback when a coach has none (follower_/sender_/author_/invited_by_/
-- scheduled_by_display_name). Swap every top-level value that equals the old
-- username, so old notifications neither 404 nor keep showing an email address.
-- actor_id only exists since migration 122, so older rows are matched by the
-- follower_id / sender_id they carry in the payload.
update public.notifications n
set data = (
  select jsonb_object_agg(
    e.key,
    case when e.value = to_jsonb(r.old_username) then to_jsonb(r.new_username) else e.value end
  )
  from jsonb_each(n.data) e
)
from username_renames r
where (n.actor_id = r.id
       or n.data->>'follower_id' = r.id::text
       or n.data->>'sender_id' = r.id::text)
  and exists (select 1 from jsonb_each(n.data) e where e.value = to_jsonb(r.old_username));

do $$
declare
  leftover int;
begin
  select count(*) into leftover
  from public.profiles
  where username <> regexp_replace(username, '^[[:space:] ]+|[[:space:] ]+$', '', 'g') or username like '%@%';
  if leftover > 0 then
    raise notice '130_clean_unsafe_usernames: % profile(s) still have whitespace or an email-address username and need a manual rename', leftover;
  end if;
end $$;

drop table username_renames;
