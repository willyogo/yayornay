import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { tokenAbi } from '@buildeross/sdk';
import { CONTRACTS } from '../config/contracts';
import { useServerWallet } from './useServerWallet';

/**
 * Hook to check and manage delegation to server wallet
 */
export function useDelegation() {
  const { address } = useAccount();
  const { serverWalletAddress, loading: walletLoading } = useServerWallet();
  const [isDelegated, setIsDelegated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current delegate for user's address
  const { data: currentDelegate, isLoading: delegateLoading, refetch } = useReadContract({
    address: CONTRACTS.NFT,
    abi: tokenAbi,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!serverWalletAddress,
    },
  });

  useEffect(() => {
    if (!address || walletLoading || delegateLoading) {
      setLoading(walletLoading || delegateLoading);
      setIsDelegated(null);
      return;
    }

    // If no server wallet yet, we can't check delegation
    if (!serverWalletAddress) {
      setLoading(false);
      setIsDelegated(null);
      return;
    }

    // Check if user has delegated to server wallet
    // If delegate is null or undefined, they haven't delegated (self-delegated by default)
    // If delegate matches server wallet, they're delegated
    const delegated = currentDelegate?.toLowerCase() === serverWalletAddress.toLowerCase();
    setIsDelegated(delegated);
    setLoading(false);
  }, [address, serverWalletAddress, currentDelegate, walletLoading, delegateLoading]);

  return {
    isDelegated,
    loading: loading || walletLoading || delegateLoading,
    currentDelegate: currentDelegate as `0x${string}` | undefined,
    serverWalletAddress,
    refetch,
  };
}

