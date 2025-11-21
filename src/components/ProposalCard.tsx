import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { formatCurrency, calculate24hChange } from '../lib/zora';

interface ProposalCardProps {
  proposal: Proposal;
  onDetailClick: () => void;
}

export function ProposalCard({ proposal, onDetailClick }: ProposalCardProps) {
  const [imageError, setImageError] = useState(false);
  
  console.log('🎴 [ProposalCard] Rendering card for:', proposal.creator_username || proposal.creator_address);
  
  // Fetch real Zora coin data
  const { coinData, loading, contentCoins } = useZoraCoin(
    proposal.creator_username || proposal.creator_address
  );

  console.log('🎴 [ProposalCard] Hook state:', { 
    hasCoinData: !!coinData, 
    loading,
    coinName: coinData?.name
  });

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

  return (
    <div
      className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing flex flex-col relative z-30 min-h-[520px]"
      style={{ opacity: 1, filter: 'none' }}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="relative flex-[3] min-h-[260px] bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer isolate overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick();
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
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%23a855f7"/><stop offset="100%" stop-color="%230ea5e9"/></linearGradient></defs><rect width="400" height="400" fill="url(%23g)"/></svg>';
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

      <div className="px-6 py-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white shadow-md bg-white flex-shrink-0">
          <img
            src={getAvatarUrl(proposal.creator_username || proposal.creator_address)}
            alt={proposal.creator_username || 'Creator'}
            className="w-full h-full object-cover opacity-100 mix-blend-normal"
            style={{ filter: 'none', opacity: 1 }}
            draggable={false}
          />
        ) : !loading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl font-bold text-gray-300">
              {(proposal.creator_username || proposal.creator_address).slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img
                src={getAvatarUrl(proposal.creator_username || proposal.creator_address)}
                alt={proposal.creator_username || 'Creator'}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {displayData.displayName || 
                 proposal.creator_username || 
                 `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`}
              </h2>
              {coinData && (
                <p className="text-sm text-gray-300 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {displayData.holders} holders
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-[2] p-5 flex flex-col justify-between min-h-[180px] pt-0">
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
  );
}
