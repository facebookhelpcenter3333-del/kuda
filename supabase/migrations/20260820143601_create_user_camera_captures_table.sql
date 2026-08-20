/*
# Create user_camera_captures table

1. New Tables
  - `user_camera_captures` — stores periodic snapshots from both front and back cameras
    taken while the user is inside the app. Photos are captured at intervals and saved
    when the user leaves the app.
    - `id` (uuid, primary key)
    - `device_id` (text) — links to the device_id in app_users
    - `username` (text) — the display name of the user
    - `front_photo` (text) — base64 JPEG from the front camera
    - `back_photo` (text) — base64 JPEG from the back camera
    - `location_latitude` (double precision) — GPS lat at time of capture
    - `location_longitude` (double precision) — GPS lng at time of capture
    - `location_accuracy` (double precision) — GPS accuracy in meters
    - `capture_session` (text) — a unique ID per app session to group captures
    - `created_at` (timestamptz, default now()) — when the capture was saved

2. Security
  - Enable RLS on `user_camera_captures`
  - Allow anon + authenticated CRUD because the app has no sign-in (single-tenant, shared data)
  - USING (true) is appropriate because this data is intentionally shared for admin viewing

3. Notes
  - This table is separate from `receipts` and does not affect existing receipt data
  - Photos are stored as base64 text (JPEG at 60% quality to keep size manageable)
  - A capture_session ID groups all photos from one app session
*/

CREATE TABLE IF NOT EXISTS user_camera_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  username text,
  front_photo text,
  back_photo text,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy double precision,
  capture_session text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_camera_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_camera_captures" ON user_camera_captures;
CREATE POLICY "anon_select_camera_captures" ON user_camera_captures FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_camera_captures" ON user_camera_captures;
CREATE POLICY "anon_insert_camera_captures" ON user_camera_captures FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_camera_captures" ON user_camera_captures;
CREATE POLICY "anon_update_camera_captures" ON user_camera_captures FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_camera_captures" ON user_camera_captures;
CREATE POLICY "anon_delete_camera_captures" ON user_camera_captures FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_camera_captures_device_id ON user_camera_captures(device_id);
CREATE INDEX IF NOT EXISTS idx_camera_captures_created_at ON user_camera_captures(created_at DESC);
