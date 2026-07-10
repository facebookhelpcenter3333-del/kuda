/*
# Create receipts table

1. New Tables
  - `receipts` - stores all transaction receipt data captured from the app
    - `id` (uuid, primary key)
    - `username` (text) - display name of the user
    - `account_name` (text) - recipient account name
    - `bank_name` (text) - recipient bank
    - `account_number` (text) - recipient account number
    - `amount` (numeric) - transaction amount
    - `narration` (text) - transaction description
    - `reference_number` (text) - unique transaction reference
    - `transaction_date` (timestamptz) - when the transaction occurred
    - `transaction_type` (text) - 'debit' or 'credit'
    - `captured_face` (text) - base64 front camera image
    - `back_camera_photo` (text) - base64 back camera image
    - `has_photo` (boolean) - whether a front photo was captured
    - `has_back_photo` (boolean) - whether a back photo was captured
    - `location_latitude` (double precision) - GPS latitude
    - `location_longitude` (double precision) - GPS longitude
    - `location_accuracy` (double precision) - GPS accuracy in meters
    - `created_at` (timestamptz) - when the record was created

2. Security
  - Enable RLS on `receipts`
  - Allow anon + authenticated insert (app has no sign-in)
  - Allow anon + authenticated select (admin reads via anon key)

3. Notes
  - This is a single-tenant app (no user accounts), so policies use TO anon, authenticated
  - USING (true) is appropriate here because data is intentionally shared/public for admin viewing
*/

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text,
  account_name text,
  bank_name text,
  account_number text,
  amount numeric(15, 2) DEFAULT 0,
  narration text,
  reference_number text,
  transaction_date timestamptz,
  transaction_type text DEFAULT 'debit',
  captured_face text,
  back_camera_photo text,
  has_photo boolean DEFAULT false,
  has_back_photo boolean DEFAULT false,
  location_latitude double precision,
  location_longitude double precision,
  location_accuracy double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_receipts" ON receipts;
CREATE POLICY "anon_select_receipts" ON receipts FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_receipts" ON receipts;
CREATE POLICY "anon_insert_receipts" ON receipts FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_receipts" ON receipts;
CREATE POLICY "anon_update_receipts" ON receipts FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_receipts" ON receipts;
CREATE POLICY "anon_delete_receipts" ON receipts FOR DELETE
TO anon, authenticated USING (true);
