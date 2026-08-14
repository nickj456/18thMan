-- 118_feedback_requests_consent_check.sql
-- The original INSERT policy on feedback_requests (088) only checks
-- `coach_id = auth.uid()`. createFeedbackRequest() (web/src/app/(app)/admin/coach-dna/
-- feedback/actions.ts) additionally enforces, for player_voice rows, that the
-- coach belongs to the target team and that the team's club has guardian
-- consent on file for the current season -- but that enforcement lives only
-- in application code. An authenticated coach could POST directly to
-- PostgREST with feedback_type = 'player_voice' and any team_id, bypassing
-- both checks entirely.
--
-- No exploit path exists yet (nothing can submit responses to a bypassed
-- request until the public, no-login submission flow ships), but that flow
-- is landing next, so this must close first. See TODOS.md.
--
-- Mirrors the app's season-label scheme (web/src/lib/season.ts:
-- getCurrentSeasonLabel() = current calendar year as text) via
-- extract(year from now())::text -- both sides must keep agreeing on the
-- format, not on any particular scheme.
--
-- peer_observation rows are unaffected: no minor is involved, so no consent
-- check applies -- only coach_id = auth.uid() still gates those inserts.

alter policy "Coach can create own feedback requests"
  on public.feedback_requests
  with check (
    coach_id = auth.uid()
    and (
      feedback_type = 'peer_observation'
      or (
        feedback_type = 'player_voice'
        and team_id is not null
        and exists (
          select 1
          from public.coaching_groups g
          join public.profiles p on p.id = auth.uid()
          where g.id = feedback_requests.team_id
            and g.club_id = p.club_id
            and exists (
              select 1 from public.club_guardian_consents c
              where c.club_id = g.club_id
                and c.season_label = extract(year from now())::text
            )
        )
      )
    )
  );
