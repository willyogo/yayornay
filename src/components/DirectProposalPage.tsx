import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useProposalCreation } from '../hooks/useProposalCreation';
import { useNounBalance } from '../hooks/useNounBalance';
import { useAccount } from 'wagmi';
import type { BuyCoinTransaction } from '../types/buyCoin';
import type { AppView } from '../types/view';
import {
  isValidCoinAddress,
  isValidEthAmount,
  isValidSlippage,
} from '../lib/buyCoinSDK';
import { AppHeader } from './AppHeader';
import { useZoraCoin } from '../hooks/useZoraCoin';
import { StatsGrid } from './StatsGrid';
import { calculate24hChange, formatCurrency } from '../lib/zora';
import { generateProposalTitle, generateProposalDescription } from '../lib/proposalTemplate';

interface DirectProposalPageProps {
  onSelectView: (view: AppView) => void;
  currentView: AppView;
}

const DEBOUNCE_MS = 400;

function getAvatarUrl(username: string) {
  const cleanUsername = username.replace('@', '') || 'creator';
  return `https://avatar.vercel.sh/${cleanUsername}`;
}

export function DirectProposalPage({ onSelectView }: DirectProposalPageProps) {
  const { isConnected } = useAccount();
  const { hasNoun, balance, isLoading: balanceLoading } = useNounBalance();
  const { createBuyCoinProposal, status, txHash, error, reset } = useProposalCreation();

  // Creator handle state with debouncing
  const [handleInput, setHandleInput] = useState('');
  const [debouncedHandle, setDebouncedHandle] = useState('');

  // Form state
  const [ethAmount, setEthAmount] = useState('');
  const [slippage, setSlippage] = useState('5');

  // Debounce the creator handle input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedHandle(handleInput.trim().replace(/^@+/, ''));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [handleInput]);

  // Get creator identifier for Zora hook
  const creatorIdentifier = debouncedHandle
    ? `@${debouncedHandle.replace(/^@+/, '')}`
    : null;

  // Fetch Zora coin data
  const { coinData, loading, error: zoraCoinError } = useZoraCoin(creatorIdentifier);

  // Auto-generated fields from Zora data
  const title = useMemo(() => {
    if (!coinData) return '';
    return generateProposalTitle(coinData);
  }, [coinData]);

  const description = useMemo(() => {
    if (!coinData || !ethAmount || !slippage) return '';
    return generateProposalDescription({ coinData, ethAmount, slippage });
  }, [coinData, ethAmount, slippage]);

  const coinAddress = coinData?.address || '';
  const coinName = coinData?.name || '';

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    creator?: string;
    ethAmount?: string;
    slippage?: string;
  }>({});

  // Display data for creator stats
  const displayData = useMemo(() => {
    if (coinData) {
      return {
        marketCap: formatCurrency(coinData.marketCap),
        volume24h: formatCurrency(coinData.volume24h),
        change24h: calculate24hChange(
          coinData.marketCap,
          coinData.marketCapDelta24h
        ),
        holders: coinData.uniqueHolders,
        profileImage:
          coinData.creatorProfile?.avatar?.previewImage?.medium ||
          coinData.creatorProfile?.avatar?.previewImage?.small ||
          null,
        displayName:
          coinData.creatorProfile?.displayName || coinData.creatorProfile?.handle,
      };
    }
    return null;
  }, [coinData]);

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!creatorIdentifier) {
      errors.creator = 'Creator handle is required';
    } else if (!coinData) {
      errors.creator = 'Creator coin not found. Please enter a valid creator with a Zora coin.';
    }

    if (!ethAmount.trim()) {
      errors.ethAmount = 'ETH amount is required';
    } else if (!isValidEthAmount(ethAmount)) {
      errors.ethAmount = 'Must be a positive number';
    }

    if (!slippage.trim()) {
      errors.slippage = 'Slippage is required';
    } else if (!isValidSlippage(slippage)) {
      errors.slippage = 'Slippage must be between 0 and 100';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const transaction: BuyCoinTransaction = {
      coinAddress: coinAddress as `0x${string}`,
      coinName: coinName || undefined,
      ethAmount,
      slippage,
    };

    try {
      await createBuyCoinProposal(transaction, title, description);
    } catch (err) {
      // Error is already set in the hook
      console.error('Failed to create proposal:', err);
    }
  };

  const handleReset = () => {
    reset();
    setHandleInput('');
    setDebouncedHandle('');
    setEthAmount('');
    setSlippage('5');
    setValidationErrors({});
  };

  const handleInputChange = (value: string) => {
    const normalized = value.replace(/^@+/, '').replace(/\s+/g, '');
    setHandleInput(normalized);
    setValidationErrors({});
  };

  const creatorLabel = creatorIdentifier || '@creator';
  const profileImage =
    displayData?.profileImage || getAvatarUrl(creatorIdentifier || '@creator');
  const showDetails = Boolean(creatorIdentifier && !loading && coinData);
  const canSubmit =
    Boolean(creatorIdentifier) &&
    !loading &&
    Boolean(coinData) &&
    Boolean(ethAmount) &&
    Boolean(slippage) &&
    status !== 'generating' &&
    status !== 'submitting';

  // Check if user has permission to create proposals
  const canCreateProposal = hasNoun && balance > 0;

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-yellow-500" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Wallet Not Connected</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to create proposals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (balanceLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Checking your token balance...</p>
      </div>
    );
  }

  if (!canCreateProposal) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Insufficient Voting Power</h2>
            <p className="text-muted-foreground">
              You need at least 1 DAO token to create proposals directly.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Your current balance: {balance} {balance === 1 ? 'token' : 'tokens'}
            </p>
          </div>
          <button
            onClick={() => onSelectView('auction')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Voting Power
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Proposal Created!</h2>
            <p className="text-muted-foreground">
              Your proposal has been submitted successfully.
            </p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline block mt-2"
              >
                View on Basescan
              </a>
            )}
          </div>
          <div className="space-y-3">
            <button
              onClick={handleReset}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Another Proposal
            </button>
            <button
              onClick={() => onSelectView('landing')}
              className="w-full px-6 py-3 border border-input rounded-lg hover:bg-accent transition-colors"
            >
              View Proposals
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <AppHeader view="propose" onChange={onSelectView} />

      {/* Form */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Creator Handle Input */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Creator Details</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a creator's handle to fetch their coin data from Zora.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                    @
                  </span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-9 py-3 text-lg font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
                    placeholder="zora_creator"
                    inputMode="text"
                    autoComplete="off"
                    disabled={status === 'generating' || status === 'submitting'}
                  />
                </div>
              </div>
              {validationErrors.creator && (
                <p className="text-xs text-red-500">{validationErrors.creator}</p>
              )}

              {/* Loading State */}
              {loading && creatorIdentifier && (
                <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching creator data
                </div>
              )}

              {/* Error State */}
              {zoraCoinError && creatorIdentifier && !loading && (
                <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" />
                  We could not find a creator coin for that handle.
                </div>
              )}

              {/* Creator Profile Display */}
              {showDetails && displayData && (
                <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-lg fade-in">
                  <div className="px-6 py-4 flex items-center gap-3 bg-white">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 bg-white flex-shrink-0">
                      <img
                        src={profileImage}
                        alt={creatorLabel}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getAvatarUrl(creatorLabel);
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight truncate">
                        ${displayData.displayName || creatorLabel}
                      </h2>
                    </div>
                  </div>

                  <div className="px-6 pb-6 space-y-3">
                    <StatsGrid
                      marketCap={displayData.marketCap}
                      holders={displayData.holders}
                      volume24h={displayData.volume24h}
                      change24h={displayData.change24h}
                      variant="compact"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Trade Parameters */}
            {showDetails && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold">Trade Parameters</h2>

                <div className="space-y-2">
                  <label htmlFor="ethAmount" className="text-sm font-medium">
                    ETH Amount *
                  </label>
                  <input
                    id="ethAmount"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    placeholder="0.001"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    disabled={status === 'generating' || status === 'submitting'}
                  />
                  {validationErrors.ethAmount && (
                    <p className="text-xs text-red-500">{validationErrors.ethAmount}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Amount of ETH to spend from the treasury
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="slippage" className="text-sm font-medium">
                    Slippage Tolerance (%) *
                  </label>
                  <input
                    id="slippage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    disabled={status === 'generating' || status === 'submitting'}
                  />
                  {validationErrors.slippage && (
                    <p className="text-xs text-red-500">{validationErrors.slippage}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum acceptable slippage (recommended: 5%)
                  </p>
                </div>
              </section>
            )}

            {/* Proposal Preview */}
            {showDetails && ethAmount && slippage && title && description && (
              <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Proposal Preview</h2>
                  <div className="text-xs text-muted-foreground">Auto-generated</div>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Title</p>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                  </div>

                  {/* Description */}
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-2">Description</p>
                    <div className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                      {description}
                    </div>
                  </div>

                  {/* Transaction Preview */}
                  <div className="p-4 border border-border rounded-lg bg-accent/50">
                    <h3 className="text-sm font-medium mb-3">Transaction Preview</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <p className="font-medium">Treasury</p>
                        <p className="text-muted-foreground">Source</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{ethAmount} ETH</p>
                        <p className="text-muted-foreground">Swap Amount</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{coinName || 'Coin'}</p>
                        <p className="text-muted-foreground text-xs truncate">
                          {coinAddress.slice(0, 6)}...{coinAddress.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Failed to create proposal
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'generating' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating transaction...
                </>
              )}
              {status === 'submitting' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting proposal...
                </>
              )}
              {status !== 'generating' && status !== 'submitting' && (
                <>
                  <Send className="h-5 w-5" />
                  Create Proposal
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
