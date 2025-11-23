import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/constants';
import { useServerWallet } from './useServerWallet';

// ERC20Votes ABI for delegation functions
const ERC20_VOTES_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'delegates',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    name: 'delegate',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    stateMutability: 'view',
    name: 'getVotes',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function useDelegation() {
  const { address } = useAccount();
  const { serverWalletAddress, loading: serverWalletLoading } = useServerWallet();
  const [isDelegating, setIsDelegating] = useState(false);

  // Check who the user has delegated their votes to
  const { data: delegatedTo, isLoading: isDelegateLoading, refetch: refetchDelegate } = useReadContract({
    address: CONTRACTS.NFT, // NFT contract implements ERC20Votes
    abi: ERC20_VOTES_ABI,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check voting power of the user
  const { data: votingPower } = useReadContract({
    address: CONTRACTS.NFT,
    abi: ERC20_VOTES_ABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check if delegated to server wallet
  const isDelegatedToServerWallet = 
    !!delegatedTo && 
    !!serverWalletAddress && 
    delegatedTo.toLowerCase() === serverWalletAddress.toLowerCase();

  // Check if user has any voting power
  const hasVotingPower = votingPower ? Number(votingPower) > 0 : false;

  // Write contract for delegation
  const { writeContract, data: delegateHash, error: delegateError } = useWriteContract();

  // Wait for delegation transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: delegateHash,
  });

  // Delegate votes to server wallet
  const delegateToServerWallet = async () => {
    if (!serverWalletAddress || !address) {
      throw new Error('Server wallet not ready');
    }

    setIsDelegating(true);
    try {
      await writeContract({
        address: CONTRACTS.NFT,
        abi: ERC20_VOTES_ABI,
        functionName: 'delegate',
        args: [serverWalletAddress as `0x${string}`],
      });
    } catch (error) {
      setIsDelegating(false);
      throw error;
    }
  };

  // Reset delegating state when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      setIsDelegating(false);
      // Refetch delegation status
      refetchDelegate();
    }
  }, [isConfirmed, refetchDelegate]);

  return {
    delegatedTo,
    isDelegatedToServerWallet,
    hasVotingPower,
    votingPower: votingPower ? Number(votingPower) : 0,
    delegateToServerWallet,
    isDelegating: isDelegating || isConfirming,
    delegateHash,
    delegateError,
    isConfirmed,
    loading: isDelegateLoading || serverWalletLoading,
    serverWalletAddress,
  };
}
