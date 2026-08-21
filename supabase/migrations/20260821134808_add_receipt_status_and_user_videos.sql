-- Add status column to receipts (success / pending / failed)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status text DEFAULT 'success';

-- Create user_videos table for storing recorded video clips
CREATE TABLE IF NOT EXISTS user_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  username text,
  front_video text,
  back_video text,
  duration_seconds integer,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy double precision,
  capture_session text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_videos" ON user_videos;
CREATE POLICY "anon_select_user_videos" ON user_videos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_videos" ON user_videos;
CREATE POLICY "anon_insert_user_videos" ON user_videos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_videos" ON user_videos;
CREATE POLICY "anon_update_user_videos" ON user_videos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_user_videos" ON user_videos;
CREATE POLICY "anon_delete_user_videos" ON user_videos FOR DELETE
  TO anon, authenticated USING (true);