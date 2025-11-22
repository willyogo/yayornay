-- Fix RLS policies for server_wallets table
-- Run this in Supabase SQL Editor or via: supabase db execute --file fix-rls-policy.sql

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read their own server wallet address" ON server_wallets;

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

