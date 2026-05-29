CREATE TABLE game_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opposition    TEXT NOT NULL,
  pitch         TEXT,
  kick_off_time TIMESTAMPTZ,
  home_logo_url TEXT,
  away_logo_url TEXT,
  defence       TEXT,
  attack        TEXT,
  structure     TEXT,
  aims          TEXT,
  backs         TEXT,
  forwards      TEXT,
  half_backs    TEXT,
  detail_level  TEXT NOT NULL DEFAULT 'standard' CHECK (detail_level IN ('brief', 'standard', 'detailed')),
  ai_plan       JSONB,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE game_plans ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admins_manage_game_plans"
  ON game_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Storage bucket for game plan logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-plan-logos', 'game-plan-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to game-plan-logos
CREATE POLICY "authenticated_upload_game_plan_logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'game-plan-logos' AND auth.uid() IS NOT NULL);

-- Public read for logos
CREATE POLICY "public_read_game_plan_logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-plan-logos');

-- Allow uploader to delete their own logos
CREATE POLICY "owner_delete_game_plan_logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'game-plan-logos' AND auth.uid() IS NOT NULL);
