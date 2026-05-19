-- RLS for squad_review_responses
-- squad_reviews.group_id (nullable) controls access:
--   null   → anyone authenticated can view/submit
--   set    → must be an accepted group member or the group's creator

-- Helper: returns true if the calling user can access the given review.
-- security definer so it can read squad_reviews/group tables even when called
-- from a restricted context.
create or replace function public.can_access_squad_review(p_review_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.squad_reviews sr
    where sr.id = p_review_id
      and (
        sr.group_id is null
        or exists (
          select 1 from public.group_invitations gi
          where gi.group_id = sr.group_id
            and gi.user_id = auth.uid()
            and gi.status = 'accepted'
        )
        or exists (
          select 1 from public.coaching_groups cg
          where cg.id = sr.group_id
            and cg.created_by = auth.uid()
        )
      )
  )
$$;

alter table public.squad_review_responses enable row level security;

-- SELECT: open reviews readable by anyone (anon included, for the Edge Function
-- rendering the review page); restricted reviews require membership.
create policy "select_squad_review_responses"
  on public.squad_review_responses
  for select
  using (public.can_access_squad_review(review_id));

-- INSERT: must be authenticated and pass the group check.
create policy "insert_squad_review_responses"
  on public.squad_review_responses
  for insert
  with check (
    auth.uid() is not null
    and public.can_access_squad_review(review_id)
  );
