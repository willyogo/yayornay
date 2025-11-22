import { useState, useEffect } from 'react';
import { fetchCoinData, fetchProfileCoins, getCreatorCoinAddress, ZoraCoinData, ContentCoin } from '../lib/zora';

type CacheEntry = {
  coinData: ZoraCoinData | null;
  contentCoins: ContentCoin[];
};

// Simple in-memory cache to avoid refetching creators we've already loaded
const coinCache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<CacheEntry>>();

async function loadCreatorData(creatorIdentifier: string): Promise<CacheEntry> {
  const cached = coinCache.get(creatorIdentifier);
  if (cached) return cached;

  const existing = pendingFetches.get(creatorIdentifier);
  if (existing) return existing;

  const fetchPromise = (async () => {
    const profileCoinsPromise = fetchProfileCoins(creatorIdentifier, 4);
    const coinAddress = await getCreatorCoinAddress(creatorIdentifier);

    if (!coinAddress) {
      const entry: CacheEntry = { coinData: null, contentCoins: [] };
      coinCache.set(creatorIdentifier, entry);
      return entry;
    }

    const [data, profileCoins] = await Promise.all([
      fetchCoinData(coinAddress),
      profileCoinsPromise,
    ]);

    const entry: CacheEntry = {
      coinData: data ?? null,
      contentCoins: profileCoins || [],
    };

    coinCache.set(creatorIdentifier, entry);
    return entry;
  })();

  pendingFetches.set(creatorIdentifier, fetchPromise);
  try {
    const entry = await fetchPromise;
    return entry;
  } finally {
    pendingFetches.delete(creatorIdentifier);
  }
}

export async function prefetchZoraCoinData(creatorIdentifier: string | null) {
  if (!creatorIdentifier) return;
  if (coinCache.has(creatorIdentifier) || pendingFetches.has(creatorIdentifier)) return;
  try {
    await loadCreatorData(creatorIdentifier);
  } catch (err) {
    console.error('❌ [useZoraCoin] Prefetch error:', err);
  }
}

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

    // Clear any previous creator's data so stale details don't flash while the new fetch runs
    setCoinData(null);
    setContentCoins([]);
    setError(null);

    async function loadCoinData() {
      if (!creatorIdentifier) return;
      setLoading(true);
      setError(null);

      try {
        const entry = await loadCreatorData(creatorIdentifier);
        if (!mounted) return;

        setCoinData(entry.coinData);
        setContentCoins(entry.contentCoins);

        if (!entry.coinData) {
          setError('No creator coin found');
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

    // Serve cached data immediately if we have it, then ensure fresh data is loaded in background
    const cached = coinCache.get(creatorIdentifier);
    if (cached) {
      setCoinData(cached.coinData);
      setContentCoins(cached.contentCoins);
      setLoading(false);
    }

    loadCoinData();

    return () => {
      mounted = false;
    };
  }, [creatorIdentifier]);

  return { coinData, loading, error, contentCoins };
}
