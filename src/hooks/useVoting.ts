import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';
import { CONTRACTS, GovernorABI } from '../config/contracts';
import { useServerWallet } from './useServerWallet';
import { encodeFunctionData } from 'viem';

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
  const { sendTransaction, isSending, serverWalletAddress } = useServerWallet();
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Submit a vote on-chain using the Nouns Builder Governor contract
   * Now using custodial server wallet for instant, gasless voting
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!serverWalletAddress) {
      throw new Error('Server wallet not initialized');
    }

    setError(null);
    setTxHash(null);

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

      console.log('[Voting] Submitting vote via server wallet:', {
        proposalId: proposalIdBytes32,
        voteType,
        support,
        serverWallet: serverWalletAddress,
      });

      // Encode the castVote function call
      const data = encodeFunctionData({
        abi: GovernorABI,
        functionName: 'castVote',
        args: [proposalIdBytes32, BigInt(support)],
      });

      // Send transaction via server wallet (instant, no user confirmation)
      const { hash } = await sendTransaction({
        to: CONTRACTS.GOVERNOR,
        data,
        amount: '0',
      });

      setTxHash(hash);

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
    submitting: isSending,
    txHash,
    error,
    queueVoteForLater,
    submitQueuedVote,
    getQueuedVotes
  };
}