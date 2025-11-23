import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage server wallet for the connected user
 * 
 * Automatically:
 * - Checks if user has a server wallet
 * - Creates one if needed via Edge Function
 * - Caches the wallet address
 */
export interface ServerWalletError {
  message: string;
  statusCode?: number;
  errorDetails?: any;
  functionName?: string;
  requestBody?: any;
  timestamp: string;
}

export function useServerWallet() {
  const { address } = useAccount();
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ServerWalletError | null>(null);

  useEffect(() => {
    if (!address) {
      setServerWalletAddress(null);
      setWalletId(null);
      setLoading(false);
      setError(null);
      setErrorDetails(null);
      return;
    }

    async function getOrCreateServerWallet() {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      
      try {
        const requestBody = { userAddress: address };
        console.log('[useServerWallet] Fetching wallet for address:', address);
        console.log('[useServerWallet] Supabase URL:', supabase.supabaseUrl);
        
        // First, try to get existing wallet
        const { data: existingWallet, error: getError } = await supabase.functions.invoke('get-wallet', {
          body: requestBody,
        });

        console.log('[useServerWallet] get-wallet response:', { 
          data: existingWallet, 
          error: getError,
          status: (getError as any)?.status,
        });

        if (existingWallet && !getError) {
          console.log('[useServerWallet] Found existing wallet:', existingWallet.serverWalletAddress);
          setServerWalletAddress(existingWallet.serverWalletAddress);
          setWalletId(existingWallet.walletId);
          setLoading(false);
          return;
        }

        // Check if get-wallet returned an error
        if (getError) {
          const errorInfo: ServerWalletError = {
            message: getError.message || 'Failed to get wallet',
            statusCode: (getError as any)?.status,
            errorDetails: getError,
            functionName: 'get-wallet',
            requestBody,
            timestamp: new Date().toISOString(),
          };
          console.error('[useServerWallet] get-wallet error:', errorInfo);
          setErrorDetails(errorInfo);
          setError(errorInfo.message);
        }

        // If no wallet exists, create one
        console.log('[useServerWallet] No existing wallet found, creating new one...');
        const { data: newWallet, error: createError } = await supabase.functions.invoke('create-wallet', {
          body: requestBody,
        });

        console.log('[useServerWallet] create-wallet response:', { 
          data: newWallet, 
          error: createError,
          status: (createError as any)?.status,
        });

        if (newWallet && !createError) {
          console.log('[useServerWallet] Created new wallet:', newWallet.serverWalletAddress);
          setServerWalletAddress(newWallet.serverWalletAddress);
          setWalletId(newWallet.walletId);
        } else {
          const errorInfo: ServerWalletError = {
            message: createError?.message || newWallet?.error || 'Failed to create wallet',
            statusCode: (createError as any)?.status,
            errorDetails: createError || newWallet,
            functionName: 'create-wallet',
            requestBody,
            timestamp: new Date().toISOString(),
          };
          console.error('[useServerWallet] Error creating wallet:', errorInfo);
          setErrorDetails(errorInfo);
          setError(errorInfo.message);
        }
      } catch (err) {
        const errorInfo: ServerWalletError = {
          message: err instanceof Error ? err.message : 'Unknown error',
          errorDetails: err,
          timestamp: new Date().toISOString(),
        };
        console.error('[useServerWallet] Exception:', errorInfo);
        setErrorDetails(errorInfo);
        setError(errorInfo.message);
      } finally {
        setLoading(false);
      }
    }

    getOrCreateServerWallet();
  }, [address]);

  return { serverWalletAddress, walletId, loading, error, errorDetails };
}


