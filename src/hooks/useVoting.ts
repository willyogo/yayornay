import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt, simulateContract } from 'wagmi/actions';
import { config } from '../lib/wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';
import { CONTRACTS, GovernorABI } from '../config/contracts';

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
  const { writeContractAsync } = useWriteContract();
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit a vote on-chain using the Nouns Builder Governor contract
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setSubmitting(true);
    setError(null);
    setTxHash(null);

    try {
      const support = voteTypeToSupport(voteType);

      // Convert proposalId to bytes32 format expected by the contract
      // If proposalId is numeric, convert to hex and pad to 32 bytes
      let proposalIdBytes32: `0x${string}`;
      if (proposalId.startsWith('0x')) {
        proposalIdBytes32 = proposalId as `0x${string}`;
      } else {
        // Convert numeric ID to bytes32
        const hex = BigInt(proposalId).toString(16).padStart(64, '0');
        proposalIdBytes32 = `0x${hex}` as `0x${string}`;
      }

      // Try to simulate first for better error handling
      let hash: `0x${string}` | undefined;
      try {
        const simulation = await simulateContract(config, {
          address: CONTRACTS.GOVERNOR,
          abi: GovernorABI,
          functionName: 'castVote',
          args: [proposalIdBytes32, BigInt(support)],
          account: address,
        });
        hash = await writeContractAsync(simulation.request);
      } catch (simError) {
        // Fallback to direct write if simulation fails
        hash = await writeContractAsync({
          address: CONTRACTS.GOVERNOR,
          abi: GovernorABI,
          functionName: 'castVote',
          args: [proposalIdBytes32, BigInt(support)],
        });
      }

      if (!hash) throw new Error('No transaction hash returned');

      setTxHash(hash);

      // Wait for transaction confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        timeout: 60_000,
      });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // Store vote in Supabase for analytics/UI purposes
      try {
        await supabase.from('votes').insert({
          proposal_id: proposalId,
          voter_address: address,
          vote_type: voteType,
          voting_power: 1, // Could be fetched from contract if needed
          transaction_hash: hash,
        });
      } catch (dbError) {
        // Don't fail if Supabase insert fails - the on-chain vote succeeded
        console.warn('Failed to store vote in database:', dbError);
      }

      // Return void as expected by the SwipeStack component
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote';
      setError(errorMessage);
      throw err;
    } finally {
      setSubmitting(false);
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
    submitting,
    txHash,
    error,
    queueVoteForLater,
    submitQueuedVote,
    getQueuedVotes
  };
}
