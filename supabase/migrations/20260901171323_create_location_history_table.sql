/*
# Create location_history table

## Purpose
Stores a time-series of GPS checkpoints for each app user as they move.
The admin page uses this data to display a live location preview showing
where the user traveled from and to, with a movement timeline.

## New Table: location_history
- id (uuid, primary key)
- device_id (text) — links to app_users.device_id
- username (text) — the app username at time of recording
- latitude (double precision, not null)
- longitude (double precision, not null)
- accuracy (double precision) — GPS accuracy in meters
- speed (double precision) — GPS speed if available
- heading (double precision) — GPS heading if available
- created_at (timestamptz, default now)

## Security
- RLS enabled.
- This is a single-tenant app with no sign-in, so anon + authenticated
  can read and write (the frontend uses the anon key).
- 4 separate CRUD policies, no FOR ALL.

## Index
- Index on device_id + created_at for efficient history queries.
*/

CREATE TABLE IF NOT EXISTS location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  username text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  speed double precision,
  heading double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_location_history" ON location_history;
CREATE POLICY "anon_select_location_history" ON location_history
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_location_history" ON location_history;
CREATE POLICY "anon_insert_location_history" ON location_history
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_location_history" ON location_history;
CREATE POLICY "anon_update_location_history" ON location_history
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_location_history" ON location_history;
CREATE POLICY "anon_delete_location_history" ON location_history
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_location_history_device_created
  ON location_history (device_id, created_at);
