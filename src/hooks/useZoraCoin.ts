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
  const initialCache = creatorIdentifier ? coinCache.get(creatorIdentifier) : undefined;

  const [coinData, setCoinData] = useState<ZoraCoinData | null>(initialCache?.coinData ?? null);
  const [contentCoins, setContentCoins] = useState<ContentCoin[]>(initialCache?.contentCoins ?? []);
  const [loading, setLoading] = useState(() => !!creatorIdentifier && !initialCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorIdentifier) {
      setCoinData(null);
      setContentCoins([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const cached = coinCache.get(creatorIdentifier);

    // If we already have data cached for this creator, reuse it immediately and skip the spinner
    if (cached) {
      setCoinData(cached.coinData);
      setContentCoins(cached.contentCoins);
      setLoading(false);
    } else {
      // Otherwise clear and show loading while we fetch fresh data
      setCoinData(null);
      setContentCoins([]);
      setLoading(true);
    }

    setError(null);

    async function loadCoinData() {
      if (!creatorIdentifier) return;
      const hasCachedData = !!coinCache.get(creatorIdentifier);
      setLoading(!hasCachedData);
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

    loadCoinData();

    return () => {
      mounted = false;
    };
  }, [creatorIdentifier]);

  return { coinData, loading, error, contentCoins };
}
