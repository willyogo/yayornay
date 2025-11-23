import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';
import { CONTRACTS, GovernorABI } from '../config/contracts';
import { useSponsoredTransaction } from './useSponsoredTransaction';
import { useDelegation } from './useDelegation';

export type VoteType = 'for' | 'against' | 'abstain';

// Convert vote type to on-chain support value
// 0 = Against, 1 = For, 2 = Abstain (standard Governor Bravo support values)
function voteTypeToSupport(voteType: VoteType): 0 | 1 | 2 {
  switch (voteType) {
    case 'for':
      return 1;
    case 'against':
      return 0;
    case 'abstain':
      return 2;
  }
}

export function useVoting() {
  const { address } = useAccount();
  const sponsoredTx = useSponsoredTransaction();
  const { isDelegated, loading: delegationLoading, serverWalletAddress } = useDelegation();
  const [error, setError] = useState<string | null>(null);
  const [needsDelegation, setNeedsDelegation] = useState(false);

  /**
   * Submit a vote on-chain using the Nouns Builder Governor contract
   * Gas is sponsored by Coinbase Paymaster for Smart Wallet users
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    // Check if delegation is needed (only check if not already delegated)
    if (!delegationLoading && isDelegated === false && serverWalletAddress) {
      setNeedsDelegation(true);
      throw new Error('DELEGATION_REQUIRED');
    }

    setError(null);
    setNeedsDelegation(false);

    try {
      const support = voteTypeToSupport(voteType);

      // Convert proposalId to bytes32 format expected by the contract
      let proposalIdBytes32: `0x${string}`;
      if (proposalId.startsWith('0x')) {
        proposalIdBytes32 = proposalId as `0x${string}`;
      } else {
        const hex = BigInt(proposalId).toString(16).padStart(64, '0');
        proposalIdBytes32 = `0x${hex}` as `0x${string}`;
      }

      console.log('[Voting] Submitting sponsored vote:', {
        proposalId: proposalIdBytes32,
        voteType,
        support,
      });

      // Execute sponsored transaction
      const { hash } = await sponsoredTx.execute({
        address: CONTRACTS.GOVERNOR,
        abi: GovernorABI,
        functionName: 'castVote',
        args: [proposalIdBytes32, BigInt(support)],
      });

      // Store vote in Supabase for analytics/UI purposes
      try {
        await supabase.from('votes').insert({
          proposal_id: proposalId,
          voter_address: address,
          vote_type: voteType,
          voting_power: 1,
          transaction_hash: hash,
        });
      } catch (dbError) {
        console.warn('Failed to store vote in database:', dbError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote';
      setError(errorMessage);
      throw err;
    }
  };

  /**
   * Queue a vote instead of immediately submitting it (for offline/batch voting)
   */
  const queueVoteForLater = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    queueVote(proposalId, voteType, address);
  };

  /**
   * Submit a queued vote to blockchain
   */
  const submitQueuedVote = async (queuedVote: QueuedVote) => {
    return submitVote(queuedVote.proposalId, queuedVote.voteType);
  };

  /**
   * Get all queued votes for the current user
   */
  const getQueuedVotes = (): QueuedVote[] => {
    if (!address) return [];
    return getQueuedVotesForVoter(address);
  };

  return {
    submitVote,
    submitting: sponsoredTx.isSubmitting,
    txHash: sponsoredTx.txHash,
    error: error || sponsoredTx.error,
    queueVoteForLater,
    submitQueuedVote,
    getQueuedVotes,
    needsDelegation,
    isDelegated,
    delegationLoading,
    serverWalletAddress,
    clearDelegationNeeded: () => setNeedsDelegation(false),
  };
}
