-- Fix RLS policies for server_wallets table
-- This migration ensures policies exist (idempotent)
-- Note: If policies already exist from the first migration, this will be a no-op

-- Drop existing policies if they exist (to allow recreation)
DROP POLICY IF EXISTS "Users can read their own server wallet address" ON server_wallets;
DROP POLICY IF EXISTS "Users can read server wallet addresses" ON server_wallets;
DROP POLICY IF EXISTS "Allow wallet creation" ON server_wallets;
DROP POLICY IF EXISTS "Allow wallet updates" ON server_wallets;

-- Allow read access to wallet addresses (public info)
CREATE POLICY "Users can read server wallet addresses"
  ON server_wallets FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow Edge Functions to insert wallets
CREATE POLICY "Allow wallet creation"
  ON server_wallets FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

-- Allow wallet updates
CREATE POLICY "Allow wallet updates"
  ON server_wallets FOR UPDATE
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

