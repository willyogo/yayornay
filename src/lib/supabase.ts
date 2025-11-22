import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Proposal = {
  id: string;
  dao_address: string;
  proposal_id: string;
  creator_address: string;
  creator_username: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  vote_start?: string;
  created_at: string;
  updated_at: string;
};

export type Vote = {
  id: string;
  proposal_id: string;
  voter_address: string;
  vote_type: 'for' | 'against' | 'abstain';
  transaction_hash: string | null;
  voting_power: number;
  voted_at: string;
};
