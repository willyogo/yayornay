import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';

export type VoteType = 'for' | 'against' | 'abstain';

export function useVoting() {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Queue a vote instead of immediately submitting it
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setSubmitting(true);
    try {
      // Queue the vote in localStorage
      queueVote(proposalId, voteType, address);
      
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
