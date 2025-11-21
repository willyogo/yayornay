import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';

export type VoteType = 'for' | 'against' | 'abstain';

export function useVoting() {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);

  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('votes')
        .insert({
          proposal_id: proposalId,
          voter_address: address.toLowerCase(),
          vote_type: voteType,
          voting_power: 1,
          transaction_hash: `0x${Date.now().toString(16)}`,
        });

      if (error) throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitVote, submitting };
}
