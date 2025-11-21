import { X, TrendingUp, Users, DollarSign, Coins } from 'lucide-react';
import { Proposal } from '../lib/supabase';

interface ProposalDetailModalProps {
  proposal: Proposal;
  onClose: () => void;
}

export function ProposalDetailModal({ proposal, onClose }: ProposalDetailModalProps) {
  const mockContentCoins = [
    {
      id: '1',
      title: 'My latest artwork',
      image: 'https://images.pexels.com/photos/1939485/pexels-photo-1939485.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '$2.1K',
      earnings: '$450',
      holders: 23,
      volume24h: '$890',
    },
    {
      id: '2',
      title: 'Behind the scenes',
      image: 'https://images.pexels.com/photos/1545590/pexels-photo-1545590.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '$1.8K',
      earnings: '$320',
      holders: 18,
      volume24h: '$670',
    },
    {
      id: '3',
      title: 'New collection preview',
      image: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=400',
      marketCap: '$3.2K',
      earnings: '$680',
      holders: 31,
      volume24h: '$1.2K',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
          {proposal.cover_image_url ? (
            <img
              src={proposal.cover_image_url}
              alt={proposal.creator_username || 'Creator'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl font-bold text-gray-300">
                {(proposal.creator_username || proposal.creator_address).slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-3xl font-bold mb-2">
              {proposal.creator_username || `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`}
            </h2>
            <p className="text-sm text-gray-300">{proposal.creator_address}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Proposal</h3>
              <p className="text-gray-700">{proposal.title}</p>
              {proposal.description && (
                <p className="text-sm text-gray-600 mt-2">{proposal.description}</p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Creator Coin Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <DollarSign className="w-3 h-3" />
                    Market Cap
                  </div>
                  <div className="text-xl font-bold text-gray-900">$12.5K</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    24h Volume
                  </div>
                  <div className="text-xl font-bold text-gray-900">$3.2K</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <Users className="w-3 h-3" />
                    Holders
                  </div>
                  <div className="text-xl font-bold text-gray-900">156</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-xs mb-1">
                    <Coins className="w-3 h-3" />
                    24h Change
                  </div>
                  <div className="text-xl font-bold text-green-600">+8.5%</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Content Coins</h3>
              <div className="space-y-3">
                {mockContentCoins.map((coin) => (
                  <div
                    key={coin.id}
                    className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <img
                        src={coin.image}
                        alt={coin.title}
                        className="w-20 h-20 rounded-xl object-cover"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-2 truncate">
                          {coin.title}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-gray-600">Market Cap</div>
                            <div className="font-semibold text-gray-900">
                              {coin.marketCap}
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-600">Earnings</div>
                            <div className="font-semibold text-green-600">
                              {coin.earnings}
                            </div>
                          </div>

                          <div>
                            <div className="text-gray-600">Holders</div>
                            <div className="font-semibold text-gray-900">{coin.holders}</div>
                          </div>

                          <div>
                            <div className="text-gray-600">24h Vol</div>
                            <div className="font-semibold text-gray-900">
                              {coin.volume24h}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
