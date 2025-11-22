import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Loader2,
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

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

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

const mockSubmitCreator = async (creator: string) => {
  // Simulate sending the creator handle to an API endpoint
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log('Mock submit payload', { creator });
};

export function SubmitPage({ onSelectView, currentView }: SubmitPageProps) {
  const [handleInput, setHandleInput] = useState('');
  const [debouncedHandle, setDebouncedHandle] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

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

  const changeIsPositive = displayData.change24h >= 0;
  const canSubmit =
    Boolean(creatorIdentifier) &&
    !loading &&
    submissionState !== 'submitting';

  const showDetails = Boolean(creatorIdentifier && !loading && coinData);
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
    setSubmissionState('idle');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!creatorIdentifier || !canSubmit) return;

    try {
      setSubmissionState('submitting');
      await mockSubmitCreator(creatorIdentifier);
      setSubmissionState('success');
      setTimeout(() => setSubmissionState('idle'), 2000);
    } catch (err) {
      console.error('Mock submission failed', err);
      setSubmissionState('error');
    }
  };

  useEffect(() => {
    setShowFeed(false);
  }, [creatorIdentifier]);

  const formatStat = (value?: string | number | null) => {
    if (!value) return '$0';
    return formatCurrency(value);
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

              {submissionState === 'success' && (
                <div className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Submission received for {creatorIdentifier}
                </div>
              )}

              {submissionState === 'error' && (
                <div className="inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  Something went wrong. Please try again.
                </div>
              )}
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
                            {submissionState === 'submitting' ? (
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
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function getAvatarUrl(username: string) {
  const cleanUsername = username.replace('@', '') || 'creator';
  return `https://avatar.vercel.sh/${cleanUsername}`;
}
