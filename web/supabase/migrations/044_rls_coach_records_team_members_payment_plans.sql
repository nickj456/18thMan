-- ============================================================
-- RLS: coach_record_types (CRITICAL — was fully unprotected)
-- ============================================================
ALTER TABLE public.coach_record_types ENABLE ROW LEVEL SECURITY;

-- Any club member can read the record type definitions for their club
CREATE POLICY "coach_record_types: club member read"
  ON public.coach_record_types FOR SELECT
  USING (club_id = ANY(get_my_club_ids()));

-- Only admins can create/edit/delete record types
CREATE POLICY "coach_record_types: admin insert"
  ON public.coach_record_types FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "coach_record_types: admin update"
  ON public.coach_record_types FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "coach_record_types: admin delete"
  ON public.coach_record_types FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- RLS: coach_records (CRITICAL — was fully unprotected)
-- ============================================================
ALTER TABLE public.coach_records ENABLE ROW LEVEL SECURITY;

-- Coaches see their own records; admins see all records for their club
CREATE POLICY "coach_records: own or admin read"
  ON public.coach_records FOR SELECT
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Coaches insert their own records; admins insert for anyone in their club
CREATE POLICY "coach_records: own or admin insert"
  ON public.coach_records FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Coaches update their own records; admins update for anyone in their club
CREATE POLICY "coach_records: own or admin update"
  ON public.coach_records FOR UPDATE
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete records (prevents accidental data loss by coaches)
CREATE POLICY "coach_records: admin delete"
  ON public.coach_records FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- SECURITY DEFINER helper for team_members policies
-- (mirrors get_my_club_ids() pattern)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  )
$$;

-- ============================================================
-- RLS: team_members (INFO — RLS on but zero policies,
--   also breaking events/availability JOIN checks)
-- ============================================================

-- Any team member can see the full roster for their teams
-- (required for events and availability cross-table policies to work)
CREATE POLICY "team_members: team member read"
  ON public.team_members FOR SELECT
  USING (team_id = ANY(get_my_team_ids()));

-- Coaches already in the team, or club admins, can add members
CREATE POLICY "team_members: coach admin insert"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('coach', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN memberships m ON m.club_id = t.club_id
      WHERE t.id = team_members.team_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- Coaches or club admins can update members
CREATE POLICY "team_members: coach admin update"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('coach', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN memberships m ON m.club_id = t.club_id
      WHERE t.id = team_members.team_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- Coaches or club admins can remove members
CREATE POLICY "team_members: coach admin delete"
  ON public.team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('coach', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN memberships m ON m.club_id = t.club_id
      WHERE t.id = team_members.team_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- ============================================================
-- RLS: payment_plans (INFO — RLS on but zero policies)
-- ============================================================

-- Club members can view payment plans for their club
CREATE POLICY "payment_plans: club member read"
  ON public.payment_plans FOR SELECT
  USING (club_id = ANY(get_my_club_ids()));

-- Only admins and head treasurers can manage payment plans
CREATE POLICY "payment_plans: admin treasurer insert"
  ON public.payment_plans FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'head_treasurer')
    )
  );

CREATE POLICY "payment_plans: admin treasurer update"
  ON public.payment_plans FOR UPDATE
  USING (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'head_treasurer')
    )
  );

CREATE POLICY "payment_plans: admin treasurer delete"
  ON public.payment_plans FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM memberships
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'head_treasurer')
    )
  );

-- ============================================================
-- FIX: clubs INSERT policy was WITH CHECK (true)
--   (WARN — any authenticated user could create unlimited clubs
--    by calling the PostgREST API directly, bypassing server actions)
-- New rule: admins of existing clubs, or brand-new users with
--   no memberships yet (bootstrapping their first club).
-- ============================================================
DROP POLICY IF EXISTS "clubs: authenticated insert" ON public.clubs;

CREATE POLICY "clubs: authenticated insert"
  ON public.clubs FOR INSERT
  WITH CHECK (
    -- Already an admin somewhere (creating a second club)
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE role = 'admin'
    )
    -- Or no memberships yet (first-time club setup)
    OR NOT EXISTS (
      SELECT 1 FROM memberships WHERE user_id = auth.uid()
    )
  );
