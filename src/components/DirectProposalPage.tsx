import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
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

interface DirectProposalPageProps {
  onSelectView: (view: AppView) => void;
  currentView: AppView;
}

export function DirectProposalPage({ onSelectView }: DirectProposalPageProps) {
  const { isConnected } = useAccount();
  const { hasNoun, balance, isLoading: balanceLoading } = useNounBalance();
  const { createBuyCoinProposal, status, txHash, error, reset } = useProposalCreation();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coinAddress, setCoinAddress] = useState('');
  const [coinName, setCoinName] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [slippage, setSlippage] = useState('5');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    coinAddress?: string;
    ethAmount?: string;
    slippage?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    }

    if (!description.trim()) {
      errors.description = 'Description is required';
    }

    if (!coinAddress.trim()) {
      errors.coinAddress = 'Coin address is required';
    } else if (!isValidCoinAddress(coinAddress)) {
      errors.coinAddress = 'Invalid coin address';
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
    setTitle('');
    setDescription('');
    setCoinAddress('');
    setCoinName('');
    setEthAmount('');
    setSlippage('5');
    setValidationErrors({});
  };

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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => onSelectView('landing')}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Create Proposal</h1>
          <p className="text-sm text-muted-foreground">
            Submit a proposal directly to the DAO
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 border-b border-border bg-blue-50 dark:bg-blue-950/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Direct Proposal Creation
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This proposal will use the DAO treasury to purchase Zora creator coins through
              Uniswap v4 with optimal routing.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Proposal Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Proposal Details</h2>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Purchase Creator Coin for DAO Treasury"
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                disabled={status === 'generating' || status === 'submitting'}
              />
              {validationErrors.title && (
                <p className="text-xs text-red-500">{validationErrors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain why the DAO should purchase this creator coin..."
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                disabled={status === 'generating' || status === 'submitting'}
              />
              {validationErrors.description && (
                <p className="text-xs text-red-500">{validationErrors.description}</p>
              )}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Coin Purchase Details</h2>

            <div className="space-y-2">
              <label htmlFor="coinAddress" className="text-sm font-medium">
                Coin Address *
              </label>
              <input
                id="coinAddress"
                type="text"
                value={coinAddress}
                onChange={(e) => setCoinAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background font-mono text-sm"
                disabled={status === 'generating' || status === 'submitting'}
              />
              {validationErrors.coinAddress && (
                <p className="text-xs text-red-500">{validationErrors.coinAddress}</p>
              )}
              <p className="text-xs text-muted-foreground">
                ERC-20 address of the content or creator coin
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="coinName" className="text-sm font-medium">
                Coin Name (Optional)
              </label>
              <input
                id="coinName"
                type="text"
                value={coinName}
                onChange={(e) => setCoinName(e.target.value)}
                placeholder="e.g., Creator Name"
                className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                disabled={status === 'generating' || status === 'submitting'}
              />
              <p className="text-xs text-muted-foreground">Display name for the coin</p>
            </div>

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
          </div>

          {/* Preview */}
          {coinAddress && ethAmount && (
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
            disabled={status === 'generating' || status === 'submitting'}
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
    </div>
  );
}
