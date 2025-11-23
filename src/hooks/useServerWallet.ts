import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

interface SendTransactionParams {
  to: string;
  data: string;
  amount?: string;
}

/**
 * Hook to manage server wallet for the connected user
 * 
 * Automatically:
 * - Checks if user has a server wallet
 * - Creates one if needed via Edge Function
 * - Caches the wallet address
 * - Provides sendTransaction for custodial signing
 */
export function useServerWallet() {
  const { address } = useAccount();
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!address) {
      setServerWalletAddress(null);
      setWalletId(null);
      setLoading(false);
      setError(null);
      return;
    }

    async function getOrCreateServerWallet() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('[useServerWallet] Fetching wallet for address:', address);
        
        // First, try to get existing wallet
        const { data: existingWallet, error: getError } = await supabase.functions.invoke('get-wallet', {
          body: { userAddress: address },
        });

        console.log('[useServerWallet] get-wallet response:', { existingWallet, getError });

        if (existingWallet && !getError) {
          console.log('[useServerWallet] Found existing wallet:', existingWallet.serverWalletAddress);
          setServerWalletAddress(existingWallet.serverWalletAddress);
          setWalletId(existingWallet.walletId);
          setLoading(false);
          return;
        }

        // If no wallet exists, create one
        console.log('[useServerWallet] No existing wallet found, creating new one...');
        const { data: newWallet, error: createError } = await supabase.functions.invoke('create-wallet', {
          body: { userAddress: address },
        });

        console.log('[useServerWallet] create-wallet response:', { newWallet, createError });

        if (newWallet && !createError) {
          console.log('[useServerWallet] Created new wallet:', newWallet.serverWalletAddress);
          setServerWalletAddress(newWallet.serverWalletAddress);
          setWalletId(newWallet.walletId);
        } else {
          const errorMsg = createError?.message || newWallet?.error || 'Failed to create wallet';
          console.error('[useServerWallet] Error creating wallet:', errorMsg);
          setError(errorMsg);
        }
      } catch (err) {
        console.error('[useServerWallet] Exception:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    getOrCreateServerWallet();
  }, [address]);

  // Send transaction via server wallet (custodial signing)
  const sendTransaction = useCallback(async (params: SendTransactionParams) => {
    if (!address) {
      throw new Error('No user address connected');
    }

    if (!serverWalletAddress) {
      throw new Error('Server wallet not initialized yet');
    }

    try {
      setIsSending(true);
      setError(null);

      console.log('[useServerWallet] Sending transaction:', params);

      const { data, error: fnError } = await supabase.functions.invoke('send-transaction', {
        body: {
          userAddress: address,
          to: params.to,
          data: params.data,
          amount: params.amount || '0',
        },
      });

      console.log('[useServerWallet] send-transaction response:', { data, fnError });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      return {
        hash: data.transactionHash as `0x${string}`,
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      console.error('[useServerWallet] Error sending transaction:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [address, serverWalletAddress]);

  return { 
    serverWalletAddress, 
    walletId, 
    loading, 
    error, 
    isSending,
    sendTransaction 
  };
}

