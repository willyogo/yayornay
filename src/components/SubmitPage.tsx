import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Clock3,
  TrendingDown,
  TrendingUp,
  Users,
  ArrowLeft,
  MessageCircle,
  Twitter,
  Triangle,
  Flame,
  Coins,
} from 'lucide-react';
import { AppHeader } from './AppHeader';
import { AppView } from '../types/view';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { calculate24hChange, formatCurrency } from '../lib/zora';

interface SubmitPageProps {
  onSelectView: (view: AppView) => void;
  currentView: AppView;
}

type AnalysisStatus = 'idle' | 'analyzing' | 'success' | 'rejected' | 'error';

type QueueStats = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
};

type QueueSuggestion = {
  id: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  creatorName: string;
  pfpUrl: string | null;
  confidenceScore: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  addedAt: string;
};

type AnalysisResponse = {
  username: string;
  creatorAddress: string;
  coinId: string;
  symbol: string;
  name: string;
  currentPriceUsd: number;
  volume24hUsd: number;
  alreadyHeld: boolean;
  reason: string;
  confidenceScore: number;
  suggestedAllocationUsd: number | null;
  proposalSubmitted: boolean;
  proposal?: {
    proposalId: string;
    onChainTxHash: string | null;
    ethAmount: string | null;
    status: 'pending' | 'complete' | 'failed';
  };
};

const FALLBACK_DISPLAY = {
  marketCap: '$12.5K',
  volume24h: '$3.2K',
  change24h: 8.5,
  holders: 142,
  profileImage: null as string | null,
  coverImage: null as string | null,
  displayName: null as string | null,
  bio: null as string | null,
};

const DEBOUNCE_MS = 400;
const DEFAULT_SUBMISSION_ENDPOINT = 'http://164.152.26.43/api/analyze';
const SUBMISSION_ENDPOINT =
  import.meta.env?.VITE_SUBMISSION_ENDPOINT || DEFAULT_SUBMISSION_ENDPOINT;
const CORS_PROXIES = [
  // corsproxy.io expects the upstream URL to be URL-encoded
  (endpoint: string) => `https://corsproxy.io/?${encodeURIComponent(endpoint)}`,
  // isomorphic-git proxy supports HTTPS pages and relaxed SSL handling
  (endpoint: string) => `https://cors.isomorphic-git.org/${endpoint}`,
  // thingproxy is lenient toward self-signed certificates while returning CORS headers
  (endpoint: string) =>
    `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(endpoint)}`,
  // yacdn provides another HTTPS relay that can handle TLS quirks
  (endpoint: string) => `https://yacdn.org/proxy/${endpoint}`,
  // allorigins works similarly and provides redundancy if the first proxy blocks the request
  (endpoint: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`,
];

function wrapIfHttpsPage(endpoint: string): string[] {
  const isHttp = endpoint.startsWith('http://');
  const isHttpsPage =
    typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Always include the raw endpoint so HTTP deployments can still call it directly.
  // When the app runs over HTTPS, browsers will block direct HTTP requests, so we
  // prepend HTTPS-friendly proxy variants to keep a working option.
  if (!isHttp || !isHttpsPage) return [endpoint];

  const proxied = CORS_PROXIES.map((proxyBuilder) => proxyBuilder(endpoint));
  // On HTTPS pages, avoid mixed-content rejections by only using HTTPS-friendly
  // proxy URLs. We skip the raw HTTP endpoint so every attempted request remains
  // HTTPS.
  return proxied;
}

function addEndpointWithVariants(endpoint: string, collector: Set<string>) {
  const variants = [endpoint];

  if (endpoint.startsWith('https://')) {
    variants.push(endpoint.replace('https://', 'http://'));
  } else if (endpoint.startsWith('http://')) {
    variants.push(endpoint.replace('http://', 'https://'));
  }

  for (const variant of variants) {
    for (const candidate of wrapIfHttpsPage(variant)) {
      if (!collector.has(candidate)) {
        collector.add(candidate);
      }
    }
  }
}

function getSubmissionEndpoints(): string[] {
  const endpoints = new Set<string>();

  if (SUBMISSION_ENDPOINT) {
    addEndpointWithVariants(SUBMISSION_ENDPOINT, endpoints);
  }

  if (DEFAULT_SUBMISSION_ENDPOINT) {
    addEndpointWithVariants(DEFAULT_SUBMISSION_ENDPOINT, endpoints);
  }

  return Array.from(endpoints);
}

const mockQueueResponse = {
  stats: {
    total: 5,
    pending: 2,
    processing: 1,
    completed: 2,
    failed: 0,
  } satisfies QueueStats,
  suggestions: [
    {
      id: 'suggestion_123_abc',
      coinId: '0x...',
      coinSymbol: 'COIN',
      coinName: 'Coin Name',
      creatorName: 'creator',
      pfpUrl: 'https://imagedelivery.net/12345',
      confidenceScore: 0.75,
      reason: '...',
      status: 'pending' as const,
      addedAt: '2025-11-22T17:00:00Z',
    },
  ],
  count: 2,
};

const mockSubmitCreator = async (creator: string): Promise<AnalysisResponse> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Allow deterministic testing: handles containing "fail" are rejected, "error" throws
  if (creator.toLowerCase().includes('error')) {
    throw new Error('Mock analysis failed');
  }

  const proposalSubmitted = !creator.toLowerCase().includes('fail');

  return {
    username: creator.replace('@', ''),
    creatorAddress: '0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b',
    coinId: '0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b',
    symbol: creator.replace('@', '') || 'zora',
    name: creator.replace('@', '') || 'Zora Creator',
    currentPriceUsd: 0.0000306,
    volume24hUsd: 70.28,
    alreadyHeld: false,
    reason:
      'The current price is very low with limited trading volume, suggesting liquidity risk. Recommend caution until momentum improves.',
    confidenceScore: 0.4,
    suggestedAllocationUsd: null,
    proposalSubmitted,
    proposal: proposalSubmitted
      ? {
          proposalId: `proposal_${Date.now()}`,
          onChainTxHash: '0x7b76edd86d8b4426532371b087e58edbc527330f78dd44e38674ea44459f365a',
          ethAmount: '0.001',
          status: 'pending',
        }
      : undefined,
  };
};

async function postSubmission(body: Record<string, unknown>) {
  const endpoints = getSubmissionEndpoints();
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Endpoint returned ${response.status}`);
      }

      return response.json();
    } catch (err) {
      lastError = err;
      console.warn(`Submission endpoint failed at ${endpoint}`, err);
    }
  }

  throw lastError || new Error('No submission endpoint configured');
}

async function fetchVotingQueue() {
  try {
    const data = await postSubmission({ username: 'queue', confidenceThreshold: 0.3 });

    if (!data?.success || !data?.suggestions) {
      throw new Error('Invalid queue response');
    }

    return {
      stats: data.stats as QueueStats,
      suggestions: data.suggestions as QueueSuggestion[],
      count: data.count as number,
    };
  } catch (err) {
    console.warn('Queue endpoint unavailable, using mock', err);
    return mockQueueResponse;
  }
}

async function submitCreatorAnalysis(creator: string): Promise<AnalysisResponse> {
  try {
    const data = await postSubmission({
      username: creator.replace(/^@+/, ''),
      confidenceThreshold: 0.3,
    });

    if (!data?.success || !data?.analysis) {
      throw new Error('Invalid response from submission endpoint');
    }

    const analysis = data.analysis as AnalysisResponse;

    return {
      username: analysis.username,
      creatorAddress: analysis.creatorAddress || '',
      coinId: analysis.coinId,
      symbol: analysis.symbol,
      name: analysis.name,
      currentPriceUsd: analysis.currentPriceUsd,
      volume24hUsd: analysis.volume24hUsd,
      alreadyHeld: analysis.alreadyHeld ?? false,
      reason: analysis.reason,
      confidenceScore: analysis.confidenceScore,
      suggestedAllocationUsd: analysis.suggestedAllocationUsd ?? null,
      proposalSubmitted: Boolean(analysis.proposalSubmitted),
      proposal: analysis.proposal,
    };
  } catch (err) {
    console.warn('Submission endpoint unavailable, using mock', err);
    return mockSubmitCreator(creator);
  }
}

export function SubmitPage({ onSelectView, currentView }: SubmitPageProps) {
  const [handleInput, setHandleInput] = useState('');
  const [debouncedHandle, setDebouncedHandle] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting'>('idle');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueSuggestions, setQueueSuggestions] = useState<QueueSuggestion[]>([]);
  const [queueCount, setQueueCount] = useState<number | null>(null);

  const creatorIdentifier = debouncedHandle
    ? `@${debouncedHandle.replace(/^@+/, '')}`
    : null;

  const {
    coinData,
    loading,
    error,
    contentCoins,
    hasMoreContentCoins,
    loadMoreContentCoins,
    loadingMoreContentCoins,
  } = useZoraCoin(creatorIdentifier);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedHandle(handleInput.trim().replace(/^@+/, ''));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [handleInput]);

  useEffect(() => {
    let isMounted = true;
    setQueueLoading(true);
    setQueueError(null);

    fetchVotingQueue()
      .then((response) => {
        if (!isMounted) return;
        setQueueStats(response.stats ?? null);
        setQueueSuggestions(response.suggestions ?? []);
        setQueueCount(response.count ?? null);
      })
      .catch((err) => {
        console.error('Failed to load voting queue', err);
        if (isMounted) setQueueError('Unable to load voting queue');
      })
      .finally(() => {
        if (isMounted) setQueueLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayData = useMemo(() => {
    if (coinData) {
      return {
        marketCap: formatCurrency(coinData.marketCap),
        volume24h: formatCurrency(coinData.volume24h),
        change24h: calculate24hChange(
          coinData.marketCap,
          coinData.marketCapDelta24h
        ),
        holders: coinData.uniqueHolders,
        profileImage:
          coinData.creatorProfile?.avatar?.previewImage?.medium ||
          coinData.creatorProfile?.avatar?.previewImage?.small ||
          null,
        coverImage: coinData.mediaContent?.previewImage?.medium,
        displayName:
          coinData.creatorProfile?.displayName || coinData.creatorProfile?.handle,
        bio: coinData.creatorProfile?.bio,
      };
    }

    return FALLBACK_DISPLAY;
  }, [coinData]);

  const showDetails = Boolean(creatorIdentifier && !loading && coinData);
  const changeIsPositive = displayData.change24h >= 0;
  const canSubmit =
    Boolean(creatorIdentifier) &&
    !loading &&
    submitStatus !== 'submitting' &&
    showDetails;
  const creatorLabel = creatorIdentifier || '@creator';
  const profileImage =
    displayData.profileImage || getAvatarUrl(creatorIdentifier || '@creator');
  const farcasterHandle = coinData?.creatorProfile?.socialAccounts?.farcaster?.username;
  const twitterHandle = coinData?.creatorProfile?.socialAccounts?.twitter?.username;
  const feedCoins =
    contentCoins && contentCoins.length > 0
      ? contentCoins
      : [
          {
            id: 'placeholder-1',
            title: 'Featured drop',
            image: displayData.coverImage,
            marketCap: '1',
            volume24h: '0',
            creatorEarningsUsd: '0',
          },
          {
            id: 'placeholder-2',
            title: 'Latest content coin',
            image: displayData.coverImage,
            marketCap: '0',
            volume24h: '0',
            creatorEarningsUsd: '0',
          },
        ];
  const [showFeed, setShowFeed] = useState(false);

  const handleInputChange = (value: string) => {
    const normalized = value.replace(/^@+/, '').replace(/\s+/g, '');
    setHandleInput(normalized);
    setSubmitStatus('idle');
    setAnalysisStatus('idle');
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!creatorIdentifier || !canSubmit) return;

    try {
      setSubmitStatus('submitting');
      setAnalysisStatus('analyzing');
      setAnalysis(null);
      setAnalysisError(null);

      const result = await submitCreatorAnalysis(creatorIdentifier);
      setAnalysis(result);
      setAnalysisStatus(result.proposalSubmitted ? 'success' : 'rejected');
      setSubmitStatus('idle');
    } catch (err) {
      console.error('Mock submission failed', err);
      setAnalysisError(err instanceof Error ? err.message : 'Failed to submit');
      setAnalysisStatus('error');
      setSubmitStatus('idle');
    }
  };

  useEffect(() => {
    setShowFeed(false);
  }, [creatorIdentifier]);

  const formatStat = (value?: string | number | null) => {
    if (!value) return '$0';
    return formatCurrency(value);
  };

  const statusStyles: Record<QueueSuggestion['status'], string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const formatAddedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader view={currentView} onChange={onSelectView} />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    @
                  </span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-9 py-3 text-lg font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                    placeholder="zora_creator"
                    inputMode="text"
                    autoComplete="off"
                  />
                </div>
              </div>

            </section>

            <div className="space-y-3">
              {error && (
                <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  We could not find a creator coin for that handle. You can still submit.
                </div>
              )}

              {loading && creatorIdentifier && (
                <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching data
                </div>
              )}

              {showDetails && (
                <div
                  className="rounded-3xl overflow-hidden border border-gray-100 shadow-lg fade-in cursor-pointer"
                  onClick={() => {
                    if (!showFeed) setShowFeed(true);
                  }}
                >
                  {!showFeed ? (
                    <>
                      <div className="px-6 py-4 flex items-center gap-3 bg-white relative">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-md bg-white flex-shrink-0">
                          <img
                            src={profileImage}
                            alt={creatorLabel}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getAvatarUrl(creatorLabel);
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-2xl font-bold text-gray-900 leading-tight truncate">
                            {displayData.displayName || creatorLabel}
                          </h2>
                          {displayData.holders && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {displayData.holders.toLocaleString()} holders
                            </p>
                          )}
                          {(farcasterHandle || twitterHandle) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {farcasterHandle && (
                                <a
                                  href={`https://warpcast.com/${farcasterHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  @{farcasterHandle}
                                </a>
                              )}
                              {twitterHandle && (
                                <a
                                  href={`https://twitter.com/${twitterHandle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Twitter className="w-3.5 h-3.5" />
                                  @{twitterHandle}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-auto">
                          <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                              canSubmit
                                ? 'bg-black text-white hover:bg-gray-800'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {submitStatus === 'submitting' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting
                              </>
                            ) : (
                              'Submit'
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="px-6 pb-6 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-2.5 border border-blue-200/50">
                            <div className="flex items-center gap-1.5 text-blue-700 text-[10px] mb-0.5 font-medium">
                              <DollarSign className="w-3 h-3" />
                              Market Cap
                            </div>
                            <div className="text-base font-bold text-gray-900">
                              {displayData.marketCap}
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-2.5 border border-purple-200/50">
                            <div className="flex items-center gap-1.5 text-purple-700 text-[10px] mb-0.5 font-medium">
                              <TrendingUp className="w-3 h-3" />
                              24h Volume
                            </div>
                            <div className="text-base font-bold text-gray-900">
                              {displayData.volume24h}
                            </div>
                          </div>

                          <div
                            className={`rounded-xl p-2.5 col-span-2 border ${
                              changeIsPositive
                                ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50'
                                : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-1.5 text-[10px] mb-0.5 font-medium ${
                                changeIsPositive ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {changeIsPositive ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              24h Change
                            </div>
                            <div
                              className={`text-base font-bold ${
                                changeIsPositive ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {changeIsPositive ? '+' : ''}
                              {displayData.change24h.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col h-full bg-white" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Content feed</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {displayData.displayName || creatorLabel}&apos;s coins
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFeed(false);
                          }}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                        {feedCoins.map((coin, idx) => {
                          const fallbackColor =
                            ['from-indigo-500 to-blue-500', 'from-pink-500 to-rose-500'][idx % 2];
                          return (
                            <div
                              key={coin.id}
                              className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white"
                            >
                              <div className="relative aspect-video bg-gray-100">
                                {coin.image ? (
                                  <img
                                    src={coin.image}
                                    alt={coin.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className={`w-full h-full bg-gradient-to-br ${fallbackColor} flex items-center justify-center text-white text-base font-semibold`}
                                  >
                                    {coin.title}
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                              </div>
                              <div className="p-3">
                                <p className="text-base font-semibold text-gray-900 line-clamp-2">
                                  {coin.title}
                                </p>
                                <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                                  <div className="flex flex-col items-center gap-1 px-2 py-3 bg-white">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Market Cap</p>
                                    <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                                      <Triangle className="w-4 h-4 fill-green-500 text-green-500" />
                                      {formatStat(coin.marketCap)}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-1 px-2 py-3 bg-white">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400">24h Volume</p>
                                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-800">
                                      <Flame className="w-4 h-4 text-gray-700" />
                                      {formatStat(coin.volume24h || coin.totalVolume)}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-1 px-2 py-3 bg-white">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 text-center">Earnings</p>
                                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-800">
                                      <Coins className="w-4 h-4 text-gray-700" />
                                      {formatStat(coin.creatorEarningsUsd)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {loadingMoreContentCoins && (
                          <div className="flex justify-center py-3">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          </div>
                        )}

                        {hasMoreContentCoins && (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadMoreContentCoins();
                              }}
                            >
                              Load more
                            </button>
                          </div>
                        )}

                        {!hasMoreContentCoins && feedCoins.length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-2">No content coins yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analysisStatus !== 'idle' && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
                  {analysisStatus === 'analyzing' && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse flex items-center justify-center text-white font-bold">
                        🔍
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Analyzing creator</p>
                        <p className="text-xs text-gray-500">Agent Nay is reviewing this creator coin...</p>
                      </div>
                    </div>
                  )}

                  {analysisStatus === 'success' && analysis && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="font-semibold">Analysis complete. Creator has been added to the queue and will be live for voting momentarily.</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysis.reason}</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-green-700 mb-1">Confidence</p>
                          <p className="text-base font-bold text-gray-900">{Math.round(analysis.confidenceScore * 100)}%</p>
                        </div>
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-blue-700 mb-1">Price</p>
                          <p className="text-base font-bold text-gray-900">${analysis.currentPriceUsd.toFixed(6)}</p>
                        </div>
                        <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-purple-700 mb-1">24h Volume</p>
                          <p className="text-base font-bold text-gray-900">${analysis.volume24hUsd.toLocaleString()}</p>
                        </div>
                      </div>
                      {analysis.proposal?.onChainTxHash && (
                        <p className="text-xs text-gray-500">
                          Proposal #{analysis.proposal.proposalId} • tx {analysis.proposal.onChainTxHash.slice(0, 10)}...
                        </p>
                      )}
                    </div>
                  )}

                  {analysisStatus === 'rejected' && analysis && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-5 h-5" />
                        <p className="font-semibold">Analysis complete. Creator did not pass the threshold for submission at this time. You can try submitting this creator again tomorrow.</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{analysis.reason}</p>
                    </div>
                  )}

                  {analysisStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <p className="font-semibold">Analysis failed. Please try again.</p>
                      {analysisError && <span className="text-xs text-red-500">({analysisError})</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold w-fit">
                  <Clock3 className="w-4 h-4" />
                  Voting Queue
                </div>
                <h2 className="text-xl font-bold text-gray-900">Voting Queue</h2>
                <p className="text-sm text-gray-600">
                  Every 12 minutes, the top creator is selected and submitted onchain for voting. User submissions approved by
                  Agent Nay moved immediately to the top of the queue.
                </p>
              </div>

              {queueCount !== null && (
                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-semibold">
                  {queueCount} upcoming proposal{queueCount === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {queueError && (
              <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                {queueError}
              </div>
            )}

            {queueStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: queueStats.total, color: 'bg-gray-50 border-gray-200 text-gray-900' },
                  { label: 'Pending', value: queueStats.pending, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                  { label: 'Processing', value: queueStats.processing, color: 'bg-blue-50 border-blue-200 text-blue-800' },
                  { label: 'Completed', value: queueStats.completed, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                  { label: 'Failed', value: queueStats.failed, color: 'bg-rose-50 border-rose-200 text-rose-800' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl border px-4 py-3 flex flex-col gap-1 text-sm font-semibold ${stat.color}`}
                  >
                    <span className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</span>
                    <span className="text-lg">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {queueLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading queue
                </div>
              )}

              {!queueLoading && queueSuggestions.length === 0 && (
                <p className="text-sm text-gray-500">No proposals are currently queued.</p>
              )}

              {queueSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white shadow bg-white">
                      <img
                        src={suggestion.pfpUrl || getAvatarUrl(suggestion.creatorName)}
                        alt={suggestion.creatorName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {suggestion.coinName} ({suggestion.coinSymbol})
                      </p>
                      <p className="text-xs text-gray-600 truncate">{suggestion.creatorName}</p>
                      <p className="text-xs text-gray-500 truncate">Added {formatAddedAt(suggestion.addedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusStyles[suggestion.status]}`}
                    >
                      {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1.5 font-semibold">
                      Confidence {Math.round(suggestion.confidenceScore * 100)}%
                    </div>
                  </div>

                  {suggestion.reason && (
                    <p className="text-xs text-gray-600 leading-snug bg-white border border-gray-200 rounded-lg p-3">
                      {suggestion.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function getAvatarUrl(username: string) {
  const cleanUsername = username.replace('@', '') || 'creator';
  return `https://avatar.vercel.sh/${cleanUsername}`;
}
