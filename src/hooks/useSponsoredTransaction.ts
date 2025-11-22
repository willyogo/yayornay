import { useState, useMemo, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContracts, useCallsStatus, useCapabilities } from 'wagmi/experimental';
import { Abi, Address } from 'viem';
import { base } from 'wagmi/chains';

interface SponsoredTransactionOptions {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (error: Error) => void;
}

type PendingTransaction = {
  resolve: (value: { hash: `0x${string}`; receipt?: unknown }) => void;
  reject: (error: Error) => void;
  onSuccess?: (hash: `0x${string}`) => void;
  onError?: (error: Error) => void;
};

/**
 * Hook for executing sponsored transactions via Coinbase Base Paymaster
 * Uses wagmi's experimental useCapabilities and useWriteContracts hooks
 * Only works with Coinbase Smart Wallets that support paymasterService
 */
export function useSponsoredTransaction() {
  const { address: userAddress, isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callsId, setCallsId] = useState<string | undefined>(undefined);
  const pendingTxRef = useRef<PendingTransaction | null>(null);

  // Get wallet capabilities to check for paymaster support
  const { data: availableCapabilities } = useCapabilities({
    account: userAddress,
  });

  // Configure paymaster capabilities
  const capabilities = useMemo(() => {
    if (!availableCapabilities || !userAddress) {
      return {};
    }

    const capabilitiesForChain = availableCapabilities[base.id];
    
    if (
      capabilitiesForChain?.['paymasterService'] &&
      capabilitiesForChain['paymasterService'].supported
    ) {
      const paymasterUrl = import.meta.env.VITE_PAYMASTER_URL;
      
      if (!paymasterUrl) {
        console.warn('[Paymaster] VITE_PAYMASTER_URL not configured');
        return {};
      }

      return {
        paymasterService: {
          url: paymasterUrl,
        },
      };
    }

    return {};
  }, [availableCapabilities, userAddress]);

  // Hook for writing contracts with paymaster support
  const { writeContractsAsync } = useWriteContracts();

  // Monitor the status of the transaction
  const { data: callsStatus } = useCallsStatus({
    id: callsId as string,
    query: {
      enabled: !!callsId,
      refetchInterval: (data) => {
        // Stop polling once we have a final status
        return data?.state.data?.status === 'success' ? false : 1000;
      },
    },
  });

  // Watch for transaction hash from callsStatus and resolve pending promise
  useEffect(() => {
    if (callsStatus?.receipts?.[0]?.transactionHash && !txHash && pendingTxRef.current) {
      const hash = callsStatus.receipts[0].transactionHash as `0x${string}`;
      const receipt = callsStatus.receipts[0];
      
      setTxHash(hash);
      console.log('[Paymaster] Transaction confirmed:', hash);
      setIsSubmitting(false);
      
      // Resolve the pending promise
      const pending = pendingTxRef.current;
      pending.onSuccess?.(hash);
      pending.resolve({ hash, receipt });
      pendingTxRef.current = null;
    }
  }, [callsStatus, txHash]);

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
        capabilities,
      });

      // Check if paymaster is available
      if (Object.keys(capabilities).length === 0) {
        console.warn('[Paymaster] No paymaster capabilities detected - transaction may require gas');
      }

      // Execute transaction with paymaster capabilities
      const result = await writeContractsAsync({
        contracts: [
          {
            address: options.address,
            abi: options.abi,
            functionName: options.functionName,
            args: options.args,
          },
        ],
        capabilities,
      });

      const id = typeof result === 'string' ? result : result.id;
      setCallsId(id);
      console.log('[Paymaster] Transaction submitted with ID:', id);

      // Return a promise that will be resolved by the useEffect watching callsStatus
      return new Promise<{ hash: `0x${string}`; receipt?: unknown }>((resolve, reject) => {
        pendingTxRef.current = {
          resolve,
          reject,
          onSuccess: options.onSuccess,
          onError: options.onError,
        };

        // Set a timeout to reject if transaction takes too long
        setTimeout(() => {
          if (pendingTxRef.current) {
            const timeoutError = new Error('Transaction confirmation timeout');
            pendingTxRef.current.onError?.(timeoutError);
            pendingTxRef.current.reject(timeoutError);
            pendingTxRef.current = null;
            setError(timeoutError.message);
            setIsSubmitting(false);
          }
        }, 60000); // 60 second timeout
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Transaction failed');
      console.error('[Paymaster] Transaction error:', error);
      setError(error.message);
      setIsSubmitting(false);
      options.onError?.(error);
      throw error;
    }
  };

  return {
    execute,
    isSubmitting,
    txHash,
    error,
    callsStatus,
    hasPaymasterSupport: Object.keys(capabilities).length > 0,
    reset: () => {
      setIsSubmitting(false);
      setTxHash(null);
      setError(null);
      setCallsId(undefined);
    },
  };
}
