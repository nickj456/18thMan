-- public.notifications has been missing an actor_id column since it was
-- introduced (migration 015). App code at profile/actions.ts (followUser),
-- drills/designer-actions.ts (new_drill notifications), and migration 121's
-- auto_follow_new_user() trigger all insert actor_id, but every insert
-- either silently dropped the field (app code errors were unchecked) or,
-- for the migration 121 trigger, threw "column actor_id does not exist"
-- inside the same transaction as new-user signup — breaking every signup
-- since the trigger went live.
alter table public.notifications
  add column actor_id uuid references public.profiles(id) on delete set null;

create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
