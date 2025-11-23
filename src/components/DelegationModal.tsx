import { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { tokenAbi } from '@buildeross/sdk';
import { CONTRACTS } from '../config/constants';

interface DelegationModalProps {
  isOpen: boolean;
  serverWalletAddress: string;
  onClose: () => void;
  onDelegated: () => void;
}

export function DelegationModal({
  isOpen,
  serverWalletAddress,
  onClose,
  onDelegated,
}: DelegationModalProps) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleDelegate = () => {
    if (!address || !serverWalletAddress) return;

    writeContract({
      address: CONTRACTS.NFT,
      abi: tokenAbi,
      functionName: 'delegate',
      args: [serverWalletAddress as `0x${string}`],
    });
  };

  // Close modal and notify parent when delegation succeeds
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onDelegated();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onDelegated, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            disabled={isPending || isConfirming}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Activate Invisible Signing
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium mb-1">
              This app supports "invisible" (and gas-sponsored) voting!
            </p>
            <p className="text-xs text-blue-700">
              You only need to sign this transaction once. After that, voting will be seamless and gas-free.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Gas-Free Voting</p>
                <p className="text-xs text-gray-600">No gas fees when voting on proposals</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">One-Time Setup</p>
                <p className="text-xs text-gray-600">Delegate once, vote forever seamlessly</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">You Stay in Control</p>
                <p className="text-xs text-gray-600">You can change or revoke delegation anytime</p>
              </div>
            </div>
          </div>

          {isSuccess ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">
                  Delegation successful! You can now vote seamlessly.
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={handleDelegate}
                disabled={isPending || isConfirming || !address}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50"
              >
                {isPending || isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isPending ? 'Confirm in wallet...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Activate Invisible Signing
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                You only need to sign this transaction once
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

