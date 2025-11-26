import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage server wallet for the connected user
 * 
 * Automatically:
 * - Queries database directly to check if user has a server wallet
 * - Creates one via Edge Function if wallet doesn't exist
 * - Caches the wallet address
 * 
 * Flow:
 * 1. Query Supabase database directly (faster than Edge Function)
 * 2. If wallet exists, use it
 * 3. If wallet doesn't exist (404), call create-wallet Edge Function
 * 4. Cache the wallet address for subsequent renders
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
        const normalizedAddress = address.toLowerCase();
        console.log('[useServerWallet] Fetching wallet for address:', address);
        console.log('[useServerWallet] Supabase URL:', supabase.supabaseUrl);
        
        // First, query the database directly (faster than calling Edge Function)
        const { data: walletRecord, error: dbError } = await supabase
          .from('server_wallets')
          .select('server_wallet_address, server_wallet_id, network_id')
          .eq('user_address', normalizedAddress)
          .single();

        console.log('[useServerWallet] Database query result:', { 
          data: walletRecord, 
          error: dbError,
          errorCode: dbError?.code,
        });

        // If wallet exists in database, use it
        if (walletRecord && !dbError) {
          console.log('[useServerWallet] Found existing wallet in database:', walletRecord.server_wallet_address);
          setServerWalletAddress(walletRecord.server_wallet_address);
          setWalletId(walletRecord.server_wallet_id);
          setLoading(false);
          return;
        }

        // Check if database error is "not found" (PGRST116 = no rows returned)
        // This is expected for new users - we'll create a wallet
        const isNotFound = dbError?.code === 'PGRST116' || dbError?.message?.includes('No rows');
        
        if (dbError && !isNotFound) {
          // This is a real database error, report it
          const errorInfo: ServerWalletError = {
            message: dbError.message || 'Failed to query wallet from database',
            errorDetails: dbError,
            functionName: 'database-query',
            requestBody: { userAddress: address },
            timestamp: new Date().toISOString(),
          };
          console.error('[useServerWallet] Database query error:', errorInfo);
          setErrorDetails(errorInfo);
          setError(errorInfo.message);
          setLoading(false);
          return; // Don't try to create wallet if there's a real database error
        }

        // Wallet doesn't exist - create one via Edge Function
        // This is the expected flow for new users
        console.log('[useServerWallet] Wallet not found in database - creating new wallet via Edge Function...');
        const { data: newWallet, error: createError } = await supabase.functions.invoke('create-wallet', {
          body: { userAddress: address },
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


