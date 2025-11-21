import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Proposal } from '../lib/supabase';
import { getCreatorProfile, CreatorToken } from '../lib/zora';

interface CreatorFeedModalProps {
  proposal: Proposal;
  onClose: () => void;
}

export function CreatorFeedModal({ proposal, onClose }: CreatorFeedModalProps) {
  const [tokens, setTokens] = useState<CreatorToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreatorTokens() {
      try {
        const profile = await getCreatorProfile(proposal.creator_address);
        if (profile) {
          setTokens(profile.tokens);
        }
      } catch (error) {
        console.error('Error loading creator tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCreatorTokens();
  }, [proposal.creator_address]);

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
          ) : tokens.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 p-4">
              {tokens.map((token) => (
                <a
                  key={token.id}
                  href={`https://zora.co/collect/base:${token.collectionAddress}/${token.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative bg-gray-50 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300">
                    {token.image ? (
                      <img
                        src={token.image}
                        alt={token.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                        🎨
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">
                      {token.name}
                    </h3>
                    {token.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {token.description}
                      </p>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4 text-gray-700" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No creations yet</h3>
              <p className="text-gray-500">
                This creator hasn't minted any tokens on Zora yet.
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
