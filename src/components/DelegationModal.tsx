import { X, Zap, Loader2 } from 'lucide-react';
import { useDelegation } from '../hooks/useDelegation';
import { useState } from 'react';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelegateSuccess?: () => void;
}

/**
 * Modal prompting users to delegate their votes to the server wallet
 * Enables "invisible" gas-sponsored voting through the server wallet
 */
export function DelegationModal({ isOpen, onClose, onDelegateSuccess }: DelegationModalProps) {
  const { delegateToServerWallet, isDelegating, isConfirmed, delegateError } = useDelegation();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelegate = async () => {
    setError(null);
    try {
      await delegateToServerWallet();
      // Success will be handled by isConfirmed state change
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delegate votes';
      setError(errorMessage);
    }
  };

  // If delegation succeeded, show success message
  if (isConfirmed) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => {
          onDelegateSuccess?.();
          onClose();
        }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        <div 
          className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-green-900 to-green-800 border border-green-600 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Invisible Voting Activated!
            </h2>

            <p className="text-green-100 text-center mb-8 leading-relaxed">
              Your votes will now be submitted automatically without gas fees or transaction prompts.
            </p>

            <button
              onClick={() => {
                onDelegateSuccess?.();
                onClose();
              }}
              className="w-full py-4 px-6 rounded-xl bg-white text-green-900 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Start Voting
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          disabled={isDelegating}
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-8 pt-12">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            Enable Invisible Voting
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-2 leading-relaxed">
            This app supports <span className="font-semibold text-purple-400">"invisible"</span> (and gas-sponsored) voting!
          </p>
          <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">
            You only need to sign this transaction once. After that, all your votes will be submitted automatically without gas fees.
          </p>

          {/* Error message */}
          {(error || delegateError) && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">
                {error || (delegateError instanceof Error ? delegateError.message : 'Failed to delegate')}
              </p>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleDelegate}
            disabled={isDelegating}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isDelegating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate Invisible Signing'
            )}
          </button>

          {/* Info text */}
          <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
            This delegates your voting power to a secure server wallet that votes on your behalf. You can revoke this anytime.
          </p>

          {/* Secondary action */}
          <button
            onClick={onClose}
            disabled={isDelegating}
            className="w-full mt-3 py-3 px-6 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vote Manually Instead
          </button>
        </div>
      </div>
    </div>
  );
}
