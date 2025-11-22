-- Migration: Create server_wallets table for CDP server wallet integration
-- This table stores server wallet information for each user

CREATE TABLE IF NOT EXISTS server_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL UNIQUE, -- The user's connected wallet address
  server_wallet_id text NOT NULL UNIQUE, -- CDP wallet ID
  server_wallet_address text NOT NULL, -- The server wallet's address
  wallet_data jsonb NOT NULL, -- Serialized wallet data (should be encrypted in production!)
  network_id text DEFAULT 'base-sepolia',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_server_wallets_user_address 
  ON server_wallets(user_address);
CREATE INDEX IF NOT EXISTS idx_server_wallets_server_wallet_id 
  ON server_wallets(server_wallet_id);
CREATE INDEX IF NOT EXISTS idx_server_wallets_server_wallet_address 
  ON server_wallets(server_wallet_address);

-- Row Level Security
ALTER TABLE server_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to wallet addresses (public info)
CREATE POLICY "Users can read server wallet addresses"
  ON server_wallets FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Allow Edge Functions to insert wallets (service role)
-- Note: Edge Functions run with service role, so they can insert
CREATE POLICY "Allow wallet creation"
  ON server_wallets FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (true);

-- Policy: Allow wallet updates (for Edge Functions)
CREATE POLICY "Allow wallet updates"
  ON server_wallets FOR UPDATE
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- Note: wallet_data should never be exposed through RLS policies
-- Only server-side Edge Functions should access wallet_data

-- Add comment to table
COMMENT ON TABLE server_wallets IS 'Stores CDP server wallet information for each user. wallet_data contains sensitive information and should be encrypted in production.';

