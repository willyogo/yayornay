import { useState, useEffect, useCallback } from 'react';
import { fetchCoinData, fetchProfileCoins, getCreatorCoinAddress, ZoraCoinData, ContentCoin, ContentCoinsResult } from '../lib/zora';

type CacheEntry = {
  coinData: ZoraCoinData | null;
  contentCoins: ContentCoin[];
  contentCoinsPageInfo: ContentCoinsResult['pageInfo'];
};

// Simple in-memory cache to avoid refetching creators we've already loaded
const coinCache = new Map<string, CacheEntry>();
const pendingFetches = new Map<string, Promise<CacheEntry>>();
const emptyPageInfo = { endCursor: null, hasNextPage: false };
const CONTENT_PAGE_SIZE = 12;

async function loadCreatorData(creatorIdentifier: string): Promise<CacheEntry> {
  const cached = coinCache.get(creatorIdentifier);
  if (cached) return cached;

  const existing = pendingFetches.get(creatorIdentifier);
  if (existing) return existing;

  const fetchPromise = (async () => {
    const profileCoinsPromise = fetchProfileCoins(creatorIdentifier, CONTENT_PAGE_SIZE);
    const coinAddress = await getCreatorCoinAddress(creatorIdentifier);

    if (!coinAddress) {
      const profileCoinsResult = await profileCoinsPromise;
      const entry: CacheEntry = {
        coinData: null,
        contentCoins: profileCoinsResult.coins,
        contentCoinsPageInfo: profileCoinsResult.pageInfo || emptyPageInfo,
      };
      coinCache.set(creatorIdentifier, entry);
      return entry;
    }

    const [data, profileCoinsResult] = await Promise.all([
      fetchCoinData(coinAddress),
      profileCoinsPromise,
    ]);

    const entry: CacheEntry = {
      coinData: data ?? null,
      contentCoins: profileCoinsResult.coins || [],
      contentCoinsPageInfo: profileCoinsResult.pageInfo || emptyPageInfo,
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
  const [contentCoinsPageInfo, setContentCoinsPageInfo] = useState<ContentCoinsResult['pageInfo']>(initialCache?.contentCoinsPageInfo ?? emptyPageInfo);
  const [loading, setLoading] = useState(() => !!creatorIdentifier && !initialCache);
  const [loadingMoreContentCoins, setLoadingMoreContentCoins] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorIdentifier) {
      setCoinData(null);
      setContentCoins([]);
      setLoading(false);
      setContentCoinsPageInfo(emptyPageInfo);
      return;
    }

    let mounted = true;
    const cached = coinCache.get(creatorIdentifier);

    // If we already have data cached for this creator, reuse it immediately and skip the spinner
    if (cached) {
      setCoinData(cached.coinData);
      setContentCoins(cached.contentCoins);
      setContentCoinsPageInfo(cached.contentCoinsPageInfo);
      setLoading(false);
    } else {
      // Otherwise clear and show loading while we fetch fresh data
      setCoinData(null);
      setContentCoins([]);
      setContentCoinsPageInfo(emptyPageInfo);
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
        setContentCoinsPageInfo(entry.contentCoinsPageInfo);

        if (!entry.coinData) {
          setError('No creator coin found');
        }
      } catch (err) {
        console.error('❌ [useZoraCoin] Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load coin');
          setCoinData(null);
          setContentCoins([]);
          setContentCoinsPageInfo(emptyPageInfo);
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

  const hasMoreContentCoins = contentCoinsPageInfo.hasNextPage;

  const loadMoreContentCoins = useCallback(async () => {
    if (!creatorIdentifier || loadingMoreContentCoins || !contentCoinsPageInfo.hasNextPage) return;

    setLoadingMoreContentCoins(true);
    setError(null);

    try {
      const result = await fetchProfileCoins(
        creatorIdentifier,
        CONTENT_PAGE_SIZE,
        contentCoinsPageInfo.endCursor || undefined
      );

      setContentCoins((prev) => {
        const existingIds = new Set(prev.map((coin) => coin.id));
        const merged = [...prev];

        result.coins.forEach((coin) => {
          if (!existingIds.has(coin.id)) {
            merged.push(coin);
          }
        });

        return merged;
      });
      setContentCoinsPageInfo(result.pageInfo || emptyPageInfo);
    } catch (err) {
      console.error('❌ [useZoraCoin] Error loading more content coins:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content coins');
    } finally {
      setLoadingMoreContentCoins(false);
    }
  }, [contentCoinsPageInfo.endCursor, contentCoinsPageInfo.hasNextPage, creatorIdentifier, loadingMoreContentCoins]);

  return {
    coinData,
    loading,
    error,
    contentCoins,
    contentCoinsPageInfo,
    hasMoreContentCoins,
    loadMoreContentCoins,
    loadingMoreContentCoins,
  };
}
