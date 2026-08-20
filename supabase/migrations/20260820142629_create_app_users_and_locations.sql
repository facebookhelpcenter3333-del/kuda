/*
# Create app_users table for tracking installed users and their live locations

1. New Tables
  - `app_users` - tracks every user who has installed the app and granted permissions
    - `id` (uuid, primary key)
    - `device_id` (text, unique) - a unique browser/device identifier stored in localStorage
    - `username` (text) - the display name the user set for themselves
    - `is_online` (boolean, default false) - whether the user's app is currently open
    - `last_seen_at` (timestamptz) - last time the user's app sent a heartbeat
    - `location_latitude` (double precision) - current/latest GPS latitude
    - `location_longitude` (double precision) - current/latest GPS longitude
    - `location_accuracy` (double precision) - GPS accuracy in meters
    - `location_updated_at` (timestamptz) - when the location was last updated
    - `created_at` (timestamptz, default now()) - when the user first installed/registered

2. Security
  - Enable RLS on `app_users`
  - Allow anon + authenticated CRUD because the app has no sign-in (single-tenant, shared data)
  - USING (true) is appropriate because this data is intentionally shared for admin viewing

3. Notes
  - This table is separate from `receipts` and does not affect existing receipt data
  - The device_id is generated client-side and stored in localStorage to identify returning users
  - Location is updated via Supabase realtime heartbeat while the user's app is open
*/