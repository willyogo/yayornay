import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { queueVote, getQueuedVotesForVoter, QueuedVote } from '../lib/voteQueue';
import { CONTRACTS, GovernorABI } from '../config/contracts';
import { useSponsoredTransaction } from './useSponsoredTransaction';
import { useDelegation } from './useDelegation';
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
  const sponsoredTx = useSponsoredTransaction();
  const { isDelegatedToServerWallet, hasVotingPower, serverWalletAddress } = useDelegation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingViaServer, setIsSubmittingViaServer] = useState(false);

  /**
   * Submit a vote via server wallet (for delegated votes)
   * The server wallet will execute the transaction on behalf of the user
   */
  const submitVoteViaServerWallet = async (proposalId: string, voteType: VoteType) => {
    if (!address || !serverWalletAddress) {
      throw new Error('Wallet not connected or server wallet not ready');
    }

    setIsSubmittingViaServer(true);
    setError(null);

    try {
      const support = voteTypeToSupport(voteType);

      // Convert proposalId to bytes32 format
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
        governor: CONTRACTS.GOVERNOR,
      });

      // Encode the castVote function call
      const data = encodeFunctionData({
        abi: GovernorABI,
        functionName: 'castVote',
        args: [proposalIdBytes32, BigInt(support)],
      });

      console.log('[Voting] Encoded transaction data:', {
        data,
        dataLength: data.length,
      });

      const requestBody = {
        userAddress: address,
        to: CONTRACTS.GOVERNOR,
        amount: '0', // No ETH being sent, just a contract call
        data: data,
      };

      console.log('[Voting] Calling send-transaction edge function with:', requestBody);

      // Call the send-transaction edge function
      const response = await supabase.functions.invoke('send-transaction', {
        body: requestBody,
      });

      console.log('[Voting] send-transaction response:', {
        data: response.data,
        error: response.error,
        status: (response as any).status,
      });

      if (response.error) {
        console.error('[Voting] Edge function error:', {
          message: response.error.message,
          context: (response.error as any).context,
          details: response.error,
        });
        throw new Error(response.error.message || 'Failed to submit vote via server wallet');
      }

      const { transactionHash } = response.data;

      console.log('[Voting] Server wallet vote submitted:', transactionHash);

      // Store vote in Supabase for analytics/UI purposes
      try {
        await supabase.from('votes').insert({
          proposal_id: proposalId,
          voter_address: address,
          vote_type: voteType,
          voting_power: 1,
          transaction_hash: transactionHash,
        });
      } catch (dbError) {
        console.warn('Failed to store vote in database:', dbError);
      }

      return { hash: transactionHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote via server wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmittingViaServer(false);
    }
  };

  /**
   * Submit a vote on-chain using the Nouns Builder Governor contract
   * Gas is sponsored by Coinbase Paymaster for Smart Wallet users
   */
  const submitVote = async (proposalId: string, voteType: VoteType) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setError(null);

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
    submitVoteViaServerWallet,
    submitting: sponsoredTx.isSubmitting || isSubmittingViaServer,
    txHash: sponsoredTx.txHash,
    error: error || sponsoredTx.error,
    queueVoteForLater,
    submitQueuedVote,
    getQueuedVotes,
    isDelegatedToServerWallet,
    hasVotingPower,
  };
}
