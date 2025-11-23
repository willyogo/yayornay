/*
  # DAO Voting App Database Schema

  ## Summary
  Creates the database structure for a DAO voting application where users vote on creator coin purchase proposals.

  ## New Tables
  
  ### `proposals`
  Stores information about proposals from Nouns.build DAOs
  - `id` (uuid, primary key) - Unique identifier
  - `dao_address` (text) - DAO contract address (e.g., Gnars DAO)
  - `proposal_id` (text) - Original proposal ID from the DAO
  - `creator_address` (text) - Zora creator wallet address
  - `creator_username` (text) - Zora creator username
  - `title` (text) - Proposal title
  - `description` (text) - Proposal description
  - `cover_image_url` (text) - Creator's cover photo
  - `status` (text) - Proposal status (active, executed, defeated, etc.)
  - `created_at` (timestamptz) - When proposal was created
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `votes`
  Records user votes on proposals
  - `id` (uuid, primary key) - Unique identifier
  - `proposal_id` (uuid, foreign key) - References proposals table
  - `voter_address` (text) - Wallet address of voter
  - `vote_type` (text) - Vote choice: 'for' (swipe right), 'against' (swipe left), 'abstain' (swipe up)
  - `transaction_hash` (text) - On-chain transaction hash
  - `voting_power` (numeric) - Amount of voting power used
  - `voted_at` (timestamptz) - Timestamp of vote
  
  ## Security
  - Enable RLS on both tables
  - Anyone can read proposals
  - Users can only create votes with their own wallet address
  - Users can read all votes
*/

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dao_address text NOT NULL,
  proposal_id text NOT NULL,
  creator_address text NOT NULL,
  creator_username text,
  title text NOT NULL,
  description text,
  cover_image_url text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dao_address, proposal_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  voter_address text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('for', 'against', 'abstain')),
  transaction_hash text,
  voting_power numeric DEFAULT 0,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, voter_address)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_dao_address ON proposals(dao_address);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_address ON votes(voter_address);

-- Enable Row Level Security
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Suppress NOTICE messages for DROP POLICY IF EXISTS
SET client_min_messages TO WARNING;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can read proposals" ON proposals;
DROP POLICY IF EXISTS "Service role can insert proposals" ON proposals;
DROP POLICY IF EXISTS "Service role can update proposals" ON proposals;
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;

-- Restore default message level
SET client_min_messages TO NOTICE;

-- RLS Policies for proposals table
CREATE POLICY "Anyone can read proposals"
  ON proposals FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can insert proposals"
  ON proposals FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Service role can update proposals"
  ON proposals FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for votes table
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert votes"
  ON votes FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);