import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { formatCurrency, calculate24hChange } from '../lib/zora';

interface ProposalCardProps {
  proposal: Proposal;
}

type FlipState = 'front' | 'feed' | 'profile';

export function ProposalCard({ proposal }: ProposalCardProps) {
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
    },
    {
      id: 'latest-1',
      title: 'Latest content coin',
      image: 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 'latest-2',
      title: 'Exclusive drop',
      image: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 'latest-3',
      title: 'Community pick',
      image: 'https://images.pexels.com/photos/185576/pexels-photo-185576.jpeg?auto=compress&cs=tinysrgb&w=400',
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

  const rotation = flipState === 'front' ? 0 : flipState === 'feed' ? 180 : -180;
  const creatorLabel =
    proposal.creator_username ||
    `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`;
  const profileImage = displayData.profileImage || getAvatarUrl(creatorLabel);

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ opacity: 1, filter: 'none' }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative w-full h-full [perspective:2000px]">
        <div
          className="relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] [transform-style:preserve-3d]"
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          <div className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col [backface-visibility:hidden] min-h-[520px]">
            <div
              className="relative flex-[3] min-h-[260px] bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer isolate overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                setFlipState('feed');
              }}
            >
              <div
                className="h-full w-full p-3 grid grid-cols-2 grid-rows-2 gap-2"
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

              <div
                className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 z-30">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div
              className="flex-1 flex flex-col"
              onClick={(e) => {
                e.stopPropagation();
                setFlipState('profile');
              }}
            >
              <div className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-md bg-white flex-shrink-0">
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
                    {displayData.displayName || 
                     proposal.creator_username || 
                     `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`}
                  </h2>
                  {coinData && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {displayData.holders} holders
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-[2] p-5 flex flex-col justify-between min-h-[180px] pt-0 cursor-pointer hover:bg-gray-50 transition-colors">
                <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                  {proposal.title}
                </h3>

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

                  <div className={`rounded-xl p-2.5 col-span-2 border ${
                    displayData.change24h >= 0 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50' 
                      : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50'
                  }`}>
                    <div className={`flex items-center gap-1.5 text-[10px] mb-0.5 font-medium ${
                      displayData.change24h >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {displayData.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      24h Change
                    </div>
                    <div className={`text-base font-bold ${displayData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {displayData.change24h >= 0 ? '+' : ''}{displayData.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col [backface-visibility:hidden] min-h-[520px]"
            style={{ transform: 'rotateY(180deg)' }}
          >
            {flipState === 'feed' ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Content feed</p>
                    <p className="text-sm font-semibold text-gray-800">{creatorLabel}'s coins</p>
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
                          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Content coin</p>
                          <p className="text-base font-semibold text-gray-900 line-clamp-2">{coin.title}</p>
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
                    <p className="text-sm font-semibold text-gray-800">{creatorLabel}</p>
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
                        <p className="text-sm text-gray-500 mb-2">
                          {coinData.symbol ? `$${coinData.symbol}` : creatorLabel}
                        </p>
                        {displayData.bio && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {displayData.bio}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-3 border border-blue-200/50">
                          <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
                            <DollarSign className="w-4 h-4" />
                            Market Cap
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(coinData.marketCap)}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-3 border border-purple-200/50">
                          <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
                            <TrendingUp className="w-4 h-4" />
                            24h Volume
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(coinData.volume24h)}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-3 border border-green-200/50">
                          <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                            <Users className="w-4 h-4" />
                            Holders
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {coinData.uniqueHolders.toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-3 border border-orange-200/50">
                          <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                            <DollarSign className="w-4 h-4" />
                            Total Supply
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(coinData.totalSupply)}
                          </div>
                        </div>
                      </div>

                      {coinData.creatorProfile?.socialAccounts && (
                        <div className="flex gap-2">
                          {coinData.creatorProfile.socialAccounts.farcaster?.username && (
                            <a
                              href={`https://warpcast.com/${coinData.creatorProfile.socialAccounts.farcaster.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
                            >
                              Farcaster
                            </a>
                          )}
                          {coinData.creatorProfile.socialAccounts.twitter?.username && (
                            <a
                              href={`https://twitter.com/${coinData.creatorProfile.socialAccounts.twitter.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              Twitter
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
