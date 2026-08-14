-- 116_club_guardian_consents_member_select.sql
-- The original SELECT policy on club_guardian_consents (090) only allows
-- club admins (or platform admins) to see whether consent is on file. But
-- coachBelongsToTeam() (web/src/app/(app)/admin/coach-dna/feedback/actions.ts)
-- treats any coach with an accepted group invitation as a team member, which
-- does not imply club_role = 'admin'. Under RLS, that (common) caller always
-- gets zero rows back from the consent check, so createFeedbackRequest()
-- permanently redirects them to the consent-required screen even after a
-- club admin has actually granted consent.
--
-- Checking whether consent is on file is a legitimate read for any coach in
-- the club — it's no more sensitive than club membership itself. Add a
-- second permissive SELECT policy (RLS policies are OR'd together) so any
-- club member can read consent rows for their own club. Do not touch the
-- existing admin-only SELECT policy or the INSERT policy — granting consent
-- remains admin-only. Do not edit migration 090 itself; it is already
-- applied to prod (see TODOS.md: never edit an applied migration).

create policy "Club members can view consents for their club"
  on public.club_guardian_consents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = club_guardian_consents.club_id
    )
  );
