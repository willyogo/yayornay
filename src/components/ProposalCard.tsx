import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Clock } from 'lucide-react';
import { Proposal } from '../lib/supabase';

interface ProposalCardProps {
  proposal: Proposal;
  onDetailClick: () => void;
}

export function ProposalCard({ proposal, onDetailClick }: ProposalCardProps) {
  const [imageError, setImageError] = useState(false);

  const mockCreatorData = {
    marketCap: '$12.5K',
    volume24h: '$3.2K',
    change24h: 8.5,
    age: '14 days',
  };

  const getAvatarUrl = (username: string) => {
    const cleanUsername = username.replace('@', '');
    return `https://avatar.vercel.sh/${cleanUsername}`;
  };

  return (
    <div
      className="absolute inset-0 bg-white rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="relative h-2/3 bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick();
        }}
      >
        {proposal.cover_image_url && !imageError ? (
          <img
            src={proposal.cover_image_url}
            alt={proposal.creator_username || 'Creator'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl font-bold text-gray-300">
              {(proposal.creator_username || proposal.creator_address).slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
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
                {proposal.creator_username || `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`}
              </h2>
              <p className="text-sm text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {mockCreatorData.age}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-1/3 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {proposal.title}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              Market Cap
            </div>
            <div className="text-lg font-bold text-gray-900">
              {mockCreatorData.marketCap}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
              <Users className="w-3 h-3" />
              24h Volume
            </div>
            <div className="text-lg font-bold text-gray-900">
              {mockCreatorData.volume24h}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 col-span-2">
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
              {mockCreatorData.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              24h Change
            </div>
            <div className={`text-lg font-bold ${mockCreatorData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {mockCreatorData.change24h >= 0 ? '+' : ''}{mockCreatorData.change24h}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
