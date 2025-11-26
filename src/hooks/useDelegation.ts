import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useEffect } from 'react';
import { CONTRACTS } from '../config/contracts';
import { useServerWallet } from './useServerWallet';

// ERC20Votes ABI for delegation functions (on NFT contract)
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
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
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

  // Check NFT balance (how many NFTs user owns)
  const { data: nftBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.NFT,
    abi: ERC20_VOTES_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

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

  // Check current voting power (getVotes returns power at current checkpoint)
  const { data: votingPower, refetch: refetchVotingPower } = useReadContract({
    address: CONTRACTS.NFT,
    abi: ERC20_VOTES_ABI,
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const hasNFTs = nftBalance ? Number(nftBalance) > 0 : false;
  const currentVotingPower = votingPower ? Number(votingPower) : 0;

  // Check if delegated to server wallet
  const isDelegatedToServerWallet = 
    !!delegatedTo && 
    !!serverWalletAddress && 
    delegatedTo.toLowerCase() === serverWalletAddress.toLowerCase();

  // User has voting power if they have NFTs
  // (They might not have delegated to themselves yet, which is why votingPower could be 0)
  const hasVotingPower = hasNFTs;

  // Debug logging
  useEffect(() => {
    if (address) {
      console.log('[useDelegation] Status:', {
        address,
        serverWalletAddress,
        nftBalance: nftBalance ? Number(nftBalance) : 0,
        delegatedTo,
        isDelegatedToServerWallet,
        currentVotingPower,
        hasNFTs,
        hasVotingPower,
      });
    }
  }, [address, serverWalletAddress, nftBalance, delegatedTo, isDelegatedToServerWallet, currentVotingPower, hasNFTs, hasVotingPower]);

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

    console.log('[useDelegation] Delegating to server wallet:', serverWalletAddress);
    
    setIsDelegating(true);
    try {
      await writeContract({
        address: CONTRACTS.NFT,
        abi: ERC20_VOTES_ABI,
        functionName: 'delegate',
        args: [serverWalletAddress as `0x${string}`],
      });
    } catch (error) {
      console.error('[useDelegation] Delegation failed:', error);
      setIsDelegating(false);
      throw error;
    }
  };

  // Reset delegating state when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      console.log('[useDelegation] Delegation confirmed! Refetching state...');
      setIsDelegating(false);
      // Refetch all relevant data
      refetchDelegate();
      refetchVotingPower();
      refetchBalance();
    }
  }, [isConfirmed, refetchDelegate, refetchVotingPower, refetchBalance]);

  return {
    delegatedTo,
    isDelegatedToServerWallet,
    hasVotingPower,
    votingPower: currentVotingPower,
    nftBalance: nftBalance ? Number(nftBalance) : 0,
    delegateToServerWallet,
    isDelegating: isDelegating || isConfirming,
    delegateHash,
    delegateError,
    isConfirmed,
    loading: isDelegateLoading || serverWalletLoading,
    serverWalletAddress,
  };
}
