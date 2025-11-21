import { useState, useEffect } from 'react';
import { X, ExternalLink, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { fetchCoinData, getCreatorCoinAddress, ZoraCoinData, formatCurrency } from '../lib/zora';

interface CreatorFeedModalProps {
  proposal: Proposal;
  onClose: () => void;
}

export function CreatorFeedModal({ proposal, onClose }: CreatorFeedModalProps) {
  const [coinData, setCoinData] = useState<ZoraCoinData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreatorCoin() {
      try {
        const identifier = proposal.creator_username || proposal.creator_address;
        const coinAddress = await getCreatorCoinAddress(identifier);
        
        if (coinAddress) {
          const data = await fetchCoinData(coinAddress);
          setCoinData(data);
        }
      } catch (error) {
        console.error('Error loading creator coin:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCreatorCoin();
  }, [proposal.creator_address, proposal.creator_username]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xl">
              {(proposal.creator_username || proposal.creator_address).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {proposal.creator_username || `${proposal.creator_address.slice(0, 6)}...${proposal.creator_address.slice(-4)}`}
              </h2>
              <p className="text-sm text-gray-500">Creator Profile</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : coinData ? (
            <div className="p-6 space-y-6">
              {/* Coin Header */}
              <div className="flex items-start gap-4">
                {coinData.mediaContent?.previewImage?.medium && (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={coinData.mediaContent.previewImage.medium}
                      alt={coinData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {coinData.name}
                  </h3>
                  <p className="text-lg text-gray-600 mb-2">${coinData.symbol}</p>
                  {coinData.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {coinData.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                    <DollarSign className="w-4 h-4" />
                    Market Cap
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(coinData.marketCap)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                    <TrendingUp className="w-4 h-4" />
                    24h Volume
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(coinData.volume24h)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
                    <Users className="w-4 h-4" />
                    Holders
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {coinData.uniqueHolders.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-orange-600 text-sm mb-2">
                    <DollarSign className="w-4 h-4" />
                    Total Supply
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(coinData.totalSupply)}
                  </div>
                </div>
              </div>

              {/* Creator Profile */}
              {coinData.creatorProfile && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {coinData.creatorProfile.avatar?.medium && (
                      <img
                        src={coinData.creatorProfile.avatar.medium}
                        alt={coinData.creatorProfile.displayName || coinData.creatorProfile.handle || 'Creator'}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {coinData.creatorProfile.displayName || coinData.creatorProfile.handle}
                      </h4>
                      {coinData.creatorProfile.handle && (
                        <p className="text-sm text-gray-500">@{coinData.creatorProfile.handle}</p>
                      )}
                    </div>
                  </div>
                  {coinData.creatorProfile.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {coinData.creatorProfile.bio}
                    </p>
                  )}
                  {coinData.creatorProfile.socialAccounts && (
                    <div className="flex gap-2 mt-3">
                      {coinData.creatorProfile.socialAccounts.farcaster && (
                        <a
                          href={`https://warpcast.com/${coinData.creatorProfile.socialAccounts.farcaster.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          Farcaster
                        </a>
                      )}
                      {coinData.creatorProfile.socialAccounts.twitter && (
                        <a
                          href={`https://twitter.com/${coinData.creatorProfile.socialAccounts.twitter.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          Twitter
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* View on Zora */}
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
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No creator coin yet</h3>
              <p className="text-gray-500">
                This creator hasn't launched a coin on Zora yet.
              </p>
            </div>
          )}

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2">About this proposal</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {proposal.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
