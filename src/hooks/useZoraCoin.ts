import { useState, useEffect } from 'react';
import { fetchCoinData, fetchProfileCoins, getCreatorCoinAddress, ZoraCoinData, ContentCoin } from '../lib/zora';

export function useZoraCoin(creatorIdentifier: string | null) {
  const [coinData, setCoinData] = useState<ZoraCoinData | null>(null);
  const [contentCoins, setContentCoins] = useState<ContentCoin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorIdentifier) {
      setCoinData(null);
      setContentCoins([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadCoinData() {
      if (!creatorIdentifier) return;
      
      console.log('🔍 [useZoraCoin] Starting fetch for:', creatorIdentifier);
      
      setLoading(true);
      setError(null);

      try {
        const profileCoinsPromise = fetchProfileCoins(creatorIdentifier, 4);

        // First, try to get the creator's coin address
        console.log('📍 [useZoraCoin] Fetching creator coin address...');
        const coinAddress = await getCreatorCoinAddress(creatorIdentifier);
        
        console.log('📍 [useZoraCoin] Coin address result:', coinAddress);
        
        if (!coinAddress) {
          if (mounted) {
            console.warn('⚠️ [useZoraCoin] No creator coin found for:', creatorIdentifier);
            setError('No creator coin found');
            setCoinData(null);
          }
          return;
        }

        // Fetch the coin data and content coins in parallel
        console.log('💰 [useZoraCoin] Fetching coin data for address:', coinAddress);
        const [data, profileCoins] = await Promise.all([
          fetchCoinData(coinAddress),
          profileCoinsPromise,
        ]);
        
        console.log('💰 [useZoraCoin] Coin data result:', data);
        
        if (mounted) {
          setContentCoins(profileCoins || []);
          if (data) {
            console.log('✅ [useZoraCoin] Successfully loaded coin data:', {
              name: data.name,
              symbol: data.symbol,
              hasProfile: !!data.creatorProfile,
              hasAvatar: !!data.creatorProfile?.avatar?.previewImage?.medium,
              hasCoverImage: !!data.mediaContent?.previewImage?.medium
            });
            setCoinData(data);
          } else {
            console.error('❌ [useZoraCoin] Failed to load coin data');
            setError('Failed to load coin data');
            setCoinData(null);
          }
        }
      } catch (err) {
        console.error('❌ [useZoraCoin] Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load coin');
          setCoinData(null);
          setContentCoins([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCoinData();

    return () => {
      mounted = false;
    };
  }, [creatorIdentifier]);

  return { coinData, loading, error, contentCoins };
}
