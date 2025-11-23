import { X } from 'lucide-react';

interface NoVotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
}

export function NoVotesModal({ isOpen, onClose, onJoin }: NoVotesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4 pt-2">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <span className="text-3xl">🗳️</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900">
            1 NFT = 1 Vote
          </h2>

          <p className="text-gray-600 text-lg leading-relaxed">
            Bid on NFTs to vote. <br />
            <span className="font-medium text-gray-900">1 NFT</span> is auctioned off every <span className="font-medium text-gray-900">5 minutes</span> to the highest bidder.
          </p>
          
          <button
            onClick={onJoin}
            className="w-full py-3.5 bg-black text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors"
          >
            Get Votes
          </button>
        </div>
      </div>
    </div>
  );
}

