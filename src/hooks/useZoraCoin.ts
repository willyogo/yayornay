import { useState, useEffect } from 'react';
import { fetchCoinData, getCreatorCoinAddress, ZoraCoinData } from '../lib/zora';

export function useZoraCoin(creatorIdentifier: string | null) {
  const [coinData, setCoinData] = useState<ZoraCoinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorIdentifier) {
      setCoinData(null);
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

        // Fetch the coin data
        console.log('💰 [useZoraCoin] Fetching coin data for address:', coinAddress);
        const data = await fetchCoinData(coinAddress);
        
        console.log('💰 [useZoraCoin] Coin data result:', data);
        
        if (mounted) {
          if (data) {
            console.log('✅ [useZoraCoin] Successfully loaded coin data:', {
              name: data.name,
              symbol: data.symbol,
              hasProfile: !!data.creatorProfile,
              hasAvatar: !!data.creatorProfile?.avatar?.medium,
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

  return { coinData, loading, error };
}
