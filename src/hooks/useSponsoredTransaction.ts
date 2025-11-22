import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { config } from '../lib/wagmi';
import { Abi, Address } from 'viem';

interface SponsoredTransactionOptions {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  value?: bigint;
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for executing sponsored transactions via Coinbase Paymaster
 * Note: Only works with Coinbase Smart Wallets
 */
export function useSponsoredTransaction() {
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = async (options: SponsoredTransactionOptions) => {
    if (!isConnected || !userAddress) {
      const err = new Error('Wallet not connected');
      setError(err.message);
      options.onError?.(err);
      throw err;
    }

    setIsSubmitting(true);
    setError(null);
    setTxHash(null);

    try {
      console.log('[Paymaster] Executing sponsored transaction:', {
        contract: options.address,
        function: options.functionName,
        args: options.args,
        value: options.value?.toString(),
      });

      // Execute transaction - wagmi will automatically use paymaster
      // if configured in OnchainKitProvider and user has Smart Wallet
      const hash = await writeContractAsync({
        address: options.address,
        abi: options.abi,
        functionName: options.functionName,
        args: options.args,
        value: options.value,
      });

      if (!hash) {
        throw new Error('No transaction hash returned');
      }

      setTxHash(hash);
      console.log('[Paymaster] Transaction submitted:', hash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        timeout: 60_000,
      });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      console.log('[Paymaster] Transaction confirmed:', hash);
      options.onSuccess?.(hash);

      return { hash, receipt };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed');
      console.error('[Paymaster] Transaction error:', error);
      setError(error.message);
      options.onError?.(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    execute,
    isSubmitting,
    txHash,
    error,
    reset: () => {
      setIsSubmitting(false);
      setTxHash(null);
      setError(null);
    },
  };
}
