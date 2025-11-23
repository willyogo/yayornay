import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowLeft, ExternalLink, Loader2, Triangle, Flame, Coins, Twitter, MessageCircle, Clock } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { formatCurrency, calculate24hChange } from '../lib/zora';
import { EnsName } from './EnsName';
import { CountdownTimer } from './CountdownTimer';
import { StatsGrid } from './StatsGrid';

interface ProposalCardProps {
  proposal: Proposal;
  onFlipStateChange?: (state: FlipState) => void;
}

export type FlipState = 'front' | 'feed' | 'profile';

export function ProposalCard({ proposal, onFlipStateChange }: ProposalCardProps) {
  const [imageError, setImageError] = useState(false);
  const [flipState, setFlipState] = useState<FlipState>('front');
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Fetch real Zora coin data
  const {
    coinData,
    loading,
    contentCoins,
    hasMoreContentCoins,
    loadMoreContentCoins,
    loadingMoreContentCoins,
  } = useZoraCoin(proposal.creator_username || proposal.creator_address);

  // Fallback to mock data if no coin data available
  const displayData = coinData ? {
    marketCap: formatCurrency(coinData.marketCap),
    volume24h: formatCurrency(coinData.volume24h),
    change24h: calculate24hChange(coinData.marketCap, coinData.marketCapDelta24h),
    holders: coinData.uniqueHolders,
    profileImage: coinData.creatorProfile?.avatar?.previewImage?.medium || coinData.creatorProfile?.avatar?.previewImage?.small,
    coverImage: coinData.mediaContent?.previewImage?.medium,
    displayName: coinData.creatorProfile?.displayName || coinData.creatorProfile?.handle,
    bio: coinData.creatorProfile?.bio,
  } : {
    marketCap: '$12.5K',
    volume24h: '$3.2K',
    change24h: 8.5,
    holders: 142,
    profileImage: null,
    coverImage: null,
    displayName: null,
    bio: null,
  };

  const getAvatarUrl = (username: string) => {
    // Use Zora profile image if available
    if (displayData.profileImage) {
      return displayData.profileImage;
    }
    // Fallback to generated avatar
    const cleanUsername = username.replace('@', '');
    return `https://avatar.vercel.sh/${cleanUsername}`;
  };

  const getCoverImage = () => {
    // Priority: Zora media > proposal cover > fallback
    if (displayData.coverImage && !imageError) {
      return displayData.coverImage;
    }
    if (proposal.cover_image_url && !imageError) {
      return proposal.cover_image_url;
    }
    return null;
  };

  const coverImage = getCoverImage();

  const fallbackContentCoins = [
    {
      id: 'featured',
      title: 'Featured drop',
      image: coverImage || 'https://images.pexels.com/photos/1939485/pexels-photo-1939485.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '1',
      volume24h: '0',
      totalVolume: '0',
      creatorEarningsUsd: '0',
    },
    {
      id: 'latest-1',
      title: 'Latest content coin',
      image: 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '0',
      volume24h: '0',
      totalVolume: '0',
      creatorEarningsUsd: '0',
    },
    {
      id: 'latest-2',
      title: 'Exclusive drop',
      image: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '0',
      volume24h: '0',
      totalVolume: '0',
      creatorEarningsUsd: '0',
    },
    {
      id: 'latest-3',
      title: 'Community pick',
      image: 'https://images.pexels.com/photos/185576/pexels-photo-185576.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '0',
      volume24h: '0',
      totalVolume: '0',
      creatorEarningsUsd: '0',
    },
  ];

  const gridCoins = (contentCoins && contentCoins.length > 0 ? contentCoins : fallbackContentCoins)
    .slice(0, 4)
    .map((coin, idx) => ({
      ...coin,
      id: coin.id || `fallback-${idx}`,
      image: coin.image || coverImage || fallbackContentCoins[idx % fallbackContentCoins.length].image,
      title: coin.title || 'Content coin',
    }));

  const feedCoins = contentCoins.length > 0 ? contentCoins : fallbackContentCoins;

  const formatStat = (value?: string | number | null) => {
    if (!value) return '$0';
    return formatCurrency(value);
  };

  useEffect(() => {
    if (flipState !== 'feed' || !hasMoreContentCoins) return;
    const sentinel = loadMoreRef.current;
    const root = feedScrollRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMoreContentCoins();
        }
      },
      {
        root,
        threshold: 0.25,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [flipState, hasMoreContentCoins, loadMoreContentCoins]);

  // Notify parent of flip state changes
  useEffect(() => {
    onFlipStateChange?.(flipState);
  }, [flipState, onFlipStateChange]);

  const rotation = flipState === 'front' ? 0 : flipState === 'feed' ? 180 : -180;
  const creatorLabel =
    proposal.creator_username ||
    `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`;
  const profileImage = displayData.profileImage || getAvatarUrl(creatorLabel);

  return (
    <div
      className="relative w-full"
      style={{ opacity: 1, filter: 'none' }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative w-full [perspective:2000px]">
        <div
          className="relative w-full transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] [transform-style:preserve-3d]"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          <div className="relative w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col [backface-visibility:hidden]">
            <div
              className="flex flex-col"
              onClick={(e) => {
                e.stopPropagation();
                setFlipState('profile');
              }}
            >
              <div className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex-shrink-0">
                  <img
                    src={getAvatarUrl(proposal.creator_username || proposal.creator_address)}
                    alt={proposal.creator_username || 'Creator'}
                    className="w-full h-full object-cover opacity-100 mix-blend-normal"
                    style={{ filter: 'none', opacity: 1 }}
                    draggable={false}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight truncate">
                    ${displayData.displayName || proposal.creator_username || (
                      <EnsName address={proposal.creator_address} className="text-2xl font-bold text-gray-900" />
                    )}
                  </h2>
                </div>
              </div>

              <div className="px-5 pt-0 pb-2 flex flex-col justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                  {proposal.title}
                </h3>

                <StatsGrid
                  marketCap={displayData.marketCap}
                  holders={displayData.holders}
                  volume24h={displayData.volume24h}
                  change24h={displayData.change24h}
                  variant="compact"
                />
              </div>
            </div>

            <div
              className="relative bg-white cursor-pointer isolate overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                setFlipState('feed');
              }}
            >
              {proposal.status === 'pending' && (
                <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold shadow-lg backdrop-blur-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </div>
              )}

              {proposal.status === 'pending' && (
                <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 bg-white rounded-2xl shadow-xl px-6 pt-4 pb-6">
                  <CountdownTimer
                    targetDate={proposal.vote_start || proposal.created_at}
                    onComplete={() => {
                      // Optionally trigger a refetch when voting opens
                      window.location.reload();
                    }}
                  />
                </div>
              )}

              <div
                className="w-full px-5 pt-2 pb-5 grid grid-cols-2 auto-rows-fr gap-3"
                aria-hidden="true"
              >
                {gridCoins.map((coin, idx) => {
                  const fallbackColor =
                    ['from-indigo-500 to-blue-500', 'from-pink-500 to-rose-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-green-500'][idx % 4];
                  return (
                  <div
                    key={coin.id}
                    className="relative rounded-xl overflow-hidden shadow-lg bg-gray-100 aspect-square"
                  >
                    {coin.image ? (
                      <img
                        src={coin.image}
                        alt={coin.title}
                        className="w-full h-full object-cover"
                        draggable={false}
                        onError={(e) => {
                          setImageError(true);
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"400\"><defs><linearGradient id=\"g\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"%23a855f7\"/><stop offset=\"100%\" stop-color=\"%230ea5e9\"/></linearGradient></defs><rect width=\"400\" height=\"400\" fill=\"url(%23g)\"/></svg>';
                        }}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${fallbackColor} flex items-center justify-center text-white text-sm font-bold`}>
                        {coin.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  </div>
                );})}
              </div>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 z-30">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col [backface-visibility:hidden]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            {flipState === 'feed' ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Content feed</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {proposal.creator_username || <EnsName address={proposal.creator_address} />}'s coins
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlipState('front');
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                <div
                  className="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4 bg-gradient-to-b from-gray-50 to-white"
                  ref={feedScrollRef}
                >
                  {feedCoins.map((coin, idx) => {
                    const fallbackColor =
                      ['from-indigo-500 to-blue-500', 'from-pink-500 to-rose-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-green-500'][idx % 4];
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
                              draggable={false}
                              onError={(e) => {
                                setImageError(true);
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"225\"><defs><linearGradient id=\"g\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"%23a855f7\"/><stop offset=\"100%\" stop-color=\"%230ea5e9\"/></linearGradient></defs><rect width=\"400\" height=\"225\" fill=\"url(%23g)\"/></svg>';
                              }}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${fallbackColor} flex items-center justify-center text-white text-base font-semibold`}>
                              {coin.title}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                        </div>
                        <div className="p-3">
                          <p className="text-base font-semibold text-gray-900 line-clamp-2">{coin.title}</p>
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

                  <div ref={loadMoreRef} />

                  {loadingMoreContentCoins && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  )}

                  {!hasMoreContentCoins && feedCoins.length > 0 && (
                    <p className="text-center text-xs text-gray-400 py-2">No more content coins</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-white">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Creator</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {proposal.creator_username || <EnsName address={proposal.creator_address} />}
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlipState('front');
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {coinData ? (
                  <div className="flex-1 overflow-y-auto">
                    <div className="w-full h-44 bg-gray-100 overflow-hidden">
                      <img
                        src={profileImage}
                        alt={creatorLabel}
                        className="w-full h-full object-cover"
                        draggable={false}
                        onError={(e) => {
                          setImageError(true);
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"320\"><defs><linearGradient id=\"g\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"%23a855f7\"/><stop offset=\"100%\" stop-color=\"%230ea5e9\"/></linearGradient></defs><rect width=\"800\" height=\"320\" fill=\"url(%23g)\"/></svg>';
                        }}
                      />
                    </div>

                    <div className="p-5 space-y-5">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {coinData.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-1">
                          {coinData.symbol ? `$${coinData.symbol}` : creatorLabel}
                        </p>
                        <p className="text-xs text-gray-400">
                          <EnsName address={proposal.creator_address} className="text-xs text-gray-400" />
                        </p>
                        {displayData.bio && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {displayData.bio}
                          </p>
                        )}
                      </div>

                      <StatsGrid
                        marketCap={formatCurrency(coinData.marketCap)}
                        holders={coinData.uniqueHolders}
                        volume24h={formatCurrency(coinData.volume24h)}
                        change24h={calculate24hChange(coinData.marketCap, coinData.marketCapDelta24h)}
                        variant="full"
                      />

                      {coinData.creatorProfile?.socialAccounts && (
                        <div className="flex gap-2">
                          {coinData.creatorProfile.socialAccounts.farcaster?.username && (
                            <a
                              href={`https://warpcast.com/${coinData.creatorProfile.socialAccounts.farcaster.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              @{coinData.creatorProfile.socialAccounts.farcaster.username}
                            </a>
                          )}
                          {coinData.creatorProfile.socialAccounts.twitter?.username && (
                            <a
                              href={`https://twitter.com/${coinData.creatorProfile.socialAccounts.twitter.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              <Twitter className="w-3.5 h-3.5" />
                              @{coinData.creatorProfile.socialAccounts.twitter.username}
                            </a>
                          )}
                        </div>
                      )}

                      <a
                        href={`https://zora.co/collect/base:${coinData.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        View on Zora
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="text-6xl">💰</div>
                    <p className="text-lg font-semibold text-gray-900">No creator coin yet</p>
                    <p className="text-sm text-gray-500">This creator hasn't launched a coin on Zora yet.</p>
                    <button
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlipState('front');
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to proposal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
