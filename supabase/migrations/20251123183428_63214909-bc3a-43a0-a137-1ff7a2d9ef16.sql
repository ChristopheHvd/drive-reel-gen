-- Table videos avec tous les champs nécessaires
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Kie.ai tracking (UNIQUE pour retrouver dans callbacks)
  kie_task_id TEXT NOT NULL UNIQUE,
  
  -- Métadonnées génération
  mode TEXT NOT NULL CHECK (mode IN ('packshot', 'situation', 'temoignage')),
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9')),
  duration_seconds INTEGER NOT NULL DEFAULT 8,
  
  -- URLs résultats (NULL si pas encore générée)
  video_url TEXT,
  thumbnail_url TEXT,
  
  -- Statuts
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index pour performances
CREATE INDEX idx_videos_image_id ON videos(image_id);
CREATE INDEX idx_videos_team_id ON videos(team_id);
CREATE INDEX idx_videos_kie_task_id ON videos(kie_task_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_timeout_at ON videos(timeout_at) WHERE status IN ('pending', 'processing');

-- Trigger updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (team-based access)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team videos"
  ON videos FOR SELECT TO authenticated
  USING (team_id IN (SELECT user_teams()));

CREATE POLICY "Team members can insert team videos"
  ON videos FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT user_teams()));

CREATE POLICY "Team members can update team videos"
  ON videos FOR UPDATE TO authenticated
  USING (team_id IN (SELECT user_teams()))
  WITH CHECK (team_id IN (SELECT user_teams()));

CREATE POLICY "Team members can delete team videos"
  ON videos FOR DELETE TO authenticated
  USING (team_id IN (SELECT user_teams()));

-- Créer bucket privé team-videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-videos', 'team-videos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy : Team members can download
CREATE POLICY "Team members can download team videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'team-videos' 
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy : Service role only can upload
CREATE POLICY "Service role can upload videos"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'team-videos');

-- RLS Policy : Team members can delete
CREATE POLICY "Team members can delete team videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-videos' 
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );