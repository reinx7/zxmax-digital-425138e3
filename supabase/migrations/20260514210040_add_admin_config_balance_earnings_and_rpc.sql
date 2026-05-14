/*
  # Add admin_config table, balance/earnings to profiles, and RPC functions

  1. New Tables
    - `admin_config` (key, value) for storing platform configuration like commission rates

  2. Modified Tables
    - `profiles`: add `balance` (numeric, default 0) and `earnings` (numeric, default 0) columns

  3. Security
    - Enable RLS on `admin_config`
    - Only admins can read/write admin_config

  4. Functions
    - `increment_product_sales`: increment sales count on a product
*/

-- Add admin_config table
CREATE TABLE IF NOT EXISTS admin_config (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Seed default config
INSERT INTO admin_config (key, value) VALUES
  ('commission', '10'),
  ('instant_fee', '7'),
  ('min_withdrawal', '3.50'),
  ('withdrawal_days', '7')
ON CONFLICT (key) DO NOTHING;

-- Admin config policies
CREATE POLICY "Admins can read config"
  ON admin_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert config"
  ON admin_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update config"
  ON admin_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Add balance and earnings to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN balance numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'earnings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN earnings numeric DEFAULT 0;
  END IF;
END $$;

-- Add increment_product_sales function
CREATE OR REPLACE FUNCTION public.increment_product_sales(product_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products SET sales = sales + 1 WHERE id = product_id;
END;
$$;

-- Add withdrawals pix_key column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN pix_key text DEFAULT '';
  END IF;
END $$;

-- Add processed_at to withdrawals for tracking when admin approves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN processed_at timestamptz;
  END IF;
END $$;

-- Add estimated_arrival to withdrawals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'estimated_arrival'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN estimated_arrival text;
  END IF;
END $$;
