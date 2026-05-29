-- Add share token to session plans for public read-only sharing
alter table public.session_plans
  add column share_token uuid unique default null;

create index session_plans_share_token_idx
  on public.session_plans(share_token)
  where share_token is not null;

-- Allow anyone (including unauthenticated) to read a session by its share token
create policy "Anyone can view session by share token"
  on public.session_plans for select
  using (share_token is not null);
