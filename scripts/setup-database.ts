import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  console.log('Setting up database tables...');

  const createProposalsTable = `
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

    CREATE INDEX IF NOT EXISTS idx_proposals_dao_address ON proposals(dao_address);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
  `;

  const createVotesTable = `
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

    CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_votes_voter_address ON votes(voter_address);
  `;

  const { error: proposalsError } = await supabase.rpc('exec_sql', { sql: createProposalsTable });
  if (proposalsError) {
    console.error('Error creating proposals table:', proposalsError);
  } else {
    console.log('Proposals table created successfully');
  }

  const { error: votesError } = await supabase.rpc('exec_sql', { sql: createVotesTable });
  if (votesError) {
    console.error('Error creating votes table:', votesError);
  } else {
    console.log('Votes table created successfully');
  }

  console.log('Database setup complete!');
}

setupDatabase().catch(console.error);
