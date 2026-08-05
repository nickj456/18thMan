-- 091_response_disputes.sql
create type public.dispute_status as enum ('open', 'excluded', 'no_action');

create table public.response_disputes (
  id                    uuid primary key default gen_random_uuid(),
  feedback_response_id  uuid not null references public.feedback_responses(id) on delete cascade,
  raised_by             uuid not null references public.profiles(id),
  reason                text not null,
  status                public.dispute_status not null default 'open',
  resolved_by           uuid references public.profiles(id),
  resolved_at           timestamptz,
  created_at            timestamptz not null default now(),
  unique (feedback_response_id, raised_by)
);

create index response_disputes_response_id_idx on public.response_disputes(feedback_response_id);

alter table public.response_disputes enable row level security;

create policy "Coach can view own disputes"
  on public.response_disputes for select
  using (raised_by = auth.uid());

create policy "Coach can raise a dispute on a response to their own request"
  on public.response_disputes for insert
  with check (
    raised_by = auth.uid()
    and exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      where resp.id = response_disputes.feedback_response_id and r.coach_id = auth.uid()
    )
  );

create policy "Club admins can view disputes for their club's coaches"
  on public.response_disputes for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Club admins can resolve disputes for their club's coaches"
  on public.response_disputes for update
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
