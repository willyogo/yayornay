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
  const { coinData, loading } = useZoraCoin(
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
    profileImage: coinData.creatorProfile?.avatar?.medium,
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

  return (
    <div
      className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing flex flex-col"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="relative h-[60%] bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick();
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {coverImage && !loading ? (
          <img
            src={coverImage}
            alt={displayData.displayName || proposal.creator_username || 'Creator'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
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

      <div className="h-[40%] p-5 flex flex-col justify-between flex-shrink-0">
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
