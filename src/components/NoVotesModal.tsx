import { X } from 'lucide-react';

interface NoVotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToAuction: () => void;
}

/**
 * Modal shown when user attempts to vote but has no NFTs/voting power
 * Directs them to the auction page to bid on NFTs
 */
export function NoVotesModal({ isOpen, onClose, onGoToAuction }: NoVotesModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-8 pt-12">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-3xl">🏛️</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Get Voting Power
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-2 leading-relaxed">
            Bid on NFTs to vote. 1 NFT is auctioned off every 5 minutes to the highest bidder.
          </p>
          <p className="text-xl font-semibold text-center text-purple-400 mb-8">
            1 NFT = 1 vote
          </p>

          {/* CTA Button */}
          <button
            onClick={onGoToAuction}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            Go to Auction
          </button>

          {/* Secondary action */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-3 px-6 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-medium transition-all duration-200"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
