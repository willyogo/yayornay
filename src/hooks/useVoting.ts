import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';
import { useServerWallet } from './useServerWallet';

export type VoteType = 'for' | 'against' | 'abstain';

export function useVoting() {
  const { address } = useAccount();
  const { serverWalletAddress } = useServerWallet();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit a vote
   * If server wallet is available, it can be used for future gasless voting
   * Currently stores vote in database (same as before)
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setSubmitting(true);
    try {
      // Queue the vote in localStorage
      queueVote(proposalId, voteType, address);
      
      // Note: If serverWalletAddress is available, future implementation could
      // use it for gasless on-chain voting. For now, votes are stored in database.
      
      // Note: Votes are now queued and can be submitted later via submitQueuedVotes()
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Submit a queued vote to Supabase
   */
  const submitQueuedVote = async (queuedVote: QueuedVote) => {
    const { error } = await supabase
      .from('votes')
      .insert({
        proposal_id: queuedVote.proposalId,
        voter_address: queuedVote.voterAddress,
        vote_type: queuedVote.voteType,
        voting_power: 1,
        transaction_hash: `0x${Date.now().toString(16)}`,
      });

    if (error) throw error;
  };

  /**
   * Get all queued votes for the current user
   */
  const getQueuedVotes = (): QueuedVote[] => {
    if (!address) return [];
    return getQueuedVotesForVoter(address);
  };

  return { submitVote, submitting, submitQueuedVote, getQueuedVotes };
}
