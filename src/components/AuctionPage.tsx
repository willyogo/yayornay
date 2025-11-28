'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { useAuction } from '../hooks/useAuction';
import { CONTRACTS, AUCTION_HOUSE_ABI, type Auction } from '../config/contracts';
import { AppView } from '../types/view';
import AuctionHero from './AuctionHero';
import BidModal from './BidModal';
import { getAuctionStatus } from '../utils/auction';
import { fetchAuctionById, isSubgraphConfigured } from '../lib/subgraph';
import { AppHeader } from './AppHeader';
import { useSponsoredTransaction } from '../hooks/useSponsoredTransaction';

interface AuctionPageProps {
  onSelectView: (view: AppView) => void;
  currentView: AppView;
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export function AuctionPage({ onSelectView, currentView }: AuctionPageProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const {
    auction,
    countdown: _countdown,
    countdownLabel: _countdownLabel,
    status,
    settled,
    minRequiredWei,
    refetch,
  } = useAuction();

  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewNounId, setViewNounId] = useState<number | null>(null);
  const [displayAuction, setDisplayAuction] = useState<Auction | undefined>();
  const [displayCountdown, setDisplayCountdown] = useState(0);
  const lastLatestNounId = useRef<number | null>(null);
  const toMsSafe = (seconds: bigint | number) => {
    const secNumber = Number(seconds);
    if (!Number.isFinite(secNumber)) return null;
    const ms = secNumber * 1000;
    if (!Number.isFinite(ms)) return null;
    return ms;
  };

  const sponsoredTx = useSponsoredTransaction();

  // Update viewNounId when current auction changes
  useEffect(() => {
    if (!auction) return;
    const currentNounId = Number(auction.nounId);
    setViewNounId((prev) => {
      const wasViewingLatest =
        prev == null || prev === lastLatestNounId.current;
      const atOrAhead = prev != null && prev >= currentNounId;
      const nextView = wasViewingLatest || atOrAhead ? currentNounId : prev;

      if (nextView === currentNounId) {
        setDisplayAuction(auction);
      }

      lastLatestNounId.current = currentNounId;
      return nextView;
    });
  }, [auction]);

  // Fetch past auction data when viewNounId changes
  useEffect(() => {
    if (viewNounId == null || !publicClient) return;
    
    // If viewing current auction, use current auction data
    if (auction && viewNounId === Number(auction.nounId)) {
      setDisplayAuction(auction);
      return;
    }

    // Fetch past auction from subgraph
    (async () => {
      try {
        // Try subgraph first (matching original component approach)
        if (isSubgraphConfigured()) {
          const sg = await fetchAuctionById(viewNounId);
          if (sg) {
            // Use winningBid for settled auctions, highestBid for active auctions
            const bidAmount = sg.winningBid?.amount ?? sg.highestBid?.amount ?? '0';
            const bidderAddress = sg.winningBid?.bidder ?? sg.highestBid?.bidder ?? '0x0000000000000000000000000000000000000000';
            
            // Parse the subgraph ID format: "daoAddress:tokenId"
            const tokenId = sg.id.includes(':') ? sg.id.split(':')[1] : sg.id;
            
            setDisplayAuction({
              nounId: BigInt(tokenId),
              amount: BigInt(bidAmount),
              startTime: BigInt(sg.startTime),
              endTime: BigInt(sg.endTime),
              bidder: bidderAddress as `0x${string}`,
              settled: Boolean(sg.settled),
            });
            return;
          }
        }

        // No data found from subgraph - show placeholder
        setDisplayAuction({
          nounId: BigInt(viewNounId),
          amount: 0n,
          startTime: 0n,
          endTime: 0n,
          bidder: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          settled: false,
        });
      } catch (error) {
        console.error('Error fetching past auction:', error);
        // Fallback: create a placeholder auction
        setDisplayAuction({
          nounId: BigInt(viewNounId),
          amount: 0n,
          startTime: 0n,
          endTime: 0n,
          bidder: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          settled: false,
        });
      }
    })();
  }, [viewNounId, publicClient]);

  // Update countdown for display auction
  useEffect(() => {
    if (!displayAuction || displayAuction.endTime === 0n) {
      setDisplayCountdown(0);
      return;
    }
    
    const updateCountdown = () => {
      const endTimeMs = toMsSafe(displayAuction.endTime);
      if (endTimeMs == null) {
        setDisplayCountdown(0);
        return;
      }
      const remaining = endTimeMs - Date.now();
      setDisplayCountdown(Math.max(0, remaining));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1_000);
    return () => clearInterval(interval);
  }, [displayAuction]);

  const handleConnectWallet = useCallback(() => {
    if (connectors && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors]);

  const latestNounId = auction ? Number(auction.nounId) : null;
  const activeAuction = displayAuction ?? auction;
  const canGoPrev = viewNounId != null && viewNounId > 0;
  const canGoNext = latestNounId != null && viewNounId != null && viewNounId < latestNounId;
  const isCurrentView = latestNounId != null && viewNounId === latestNounId;

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;
    setViewNounId((prev) => {
      if (prev == null || prev <= 0) return prev;
      return prev - 1;
    });
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (latestNounId == null || !canGoNext) return;
    setViewNounId((prev) => {
      if (prev == null) return latestNounId;
      if (prev >= latestNounId) return prev;
      return prev + 1;
    });
  }, [latestNounId, canGoNext]);

  const dateLabel = useMemo(() => {
    if (!activeAuction || !activeAuction.startTime || activeAuction.startTime === 0n) {
      // Return a placeholder to prevent layout shift
      return '—';
    }
    const timestamp = toMsSafe(activeAuction.startTime);
    if (timestamp == null) return '—';
    if (isNaN(timestamp) || timestamp <= 0) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(timestamp)
      );
    } catch {
      return '—';
    }
  }, [activeAuction]);

  const derivedStatus =
    activeAuction && !activeAuction.settled && displayCountdown <= 0
      ? 'ended'
      : status;
  const isAuctionActive = derivedStatus === 'active';
  const canBid =
    isConnected &&
    isAuctionActive &&
    !settled &&
    auction !== undefined &&
    isCurrentView;

  const handleOpenBid = useCallback(() => {
    setActionMessage(null);
    setActionError(null);
    if (!isConnected) {
      setActionError('Please connect your wallet to bid.');
      return;
    }
    if (!canBid) {
      setActionError('Auction is not currently accepting bids.');
      return;
    }
    setBidModalOpen(true);
  }, [isConnected, canBid]);

  const handleBidSubmit = useCallback(
    async (valueWei: bigint) => {
      if (!auction) return;
      if (!isConnected) {
        setActionError('Connect a wallet to place a bid.');
        return;
      }

      try {
        setBidSubmitting(true);
        setActionError(null);
        setActionMessage(
          sponsoredTx.hasPaymasterSupport
            ? 'Submitting gasless bid...'
            : 'Submitting bid...'
        );

        // Execute sponsored bid transaction
        await sponsoredTx.execute({
          address: CONTRACTS.AUCTION_HOUSE,
          abi: AUCTION_HOUSE_ABI,
          functionName: 'createBid',
          args: [auction.nounId],
          value: valueWei,
        });

        setActionMessage('Bid confirmed!');
        setBidModalOpen(false);
        await refetch();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to place bid';
        setActionMessage(null);
        setActionError(message);
      } finally {
        setBidSubmitting(false);
        setTimeout(() => setActionMessage(null), 6000);
      }
    },
    [auction, isConnected, refetch, sponsoredTx]
  );

  const attemptSettle = useCallback(
    async (fnName: 'settleAuction' | 'settleCurrentAndCreateNewAuction') => {
      if (!auction) return null;
      try {
        await sponsoredTx.execute({
          address: CONTRACTS.AUCTION_HOUSE,
          abi: AUCTION_HOUSE_ABI,
          functionName: fnName,
        });
        
        return 'success';
      } catch (error: any) {
        throw error;
      }
    },
    [auction, sponsoredTx]
  );

  const handleSettle = useCallback(async () => {
    if (!auction) return;
    if (!isConnected) {
      setActionError('Connect a wallet to settle the auction.');
      return;
    }

    // Double-check that auction is actually ended before attempting to settle
    const auctionStatus = getAuctionStatus(auction);
    if (auctionStatus !== 'ended') {
      setActionError('Auction has not ended yet. Cannot settle.');
      return;
    }

    if (auction.settled) {
      setActionError('Auction is already settled.');
      return;
    }

    try {
      setIsSettling(true);
      setActionError(null);
      setActionMessage('Submitting settle transaction (gasless)...');
      
      console.log('[Auction] Starting settlement process:', {
        nounId: auction.nounId.toString(),
        settled: auction.settled,
        hasPaymaster: sponsoredTx.hasPaymasterSupport,
      });
      
      // Try settleCurrentAndCreateNewAuction first (for normal operation)
      // settleAuction is only used when contract is paused
      const attempts: ('settleAuction' | 'settleCurrentAndCreateNewAuction')[] = [
        'settleCurrentAndCreateNewAuction',
        'settleAuction',
      ];
      let success = false;
      let lastError: unknown = null;
      
      for (const fn of attempts) {
        try {
          const status = await attemptSettle(fn);
          if (status === 'success') {
            success = true;
            break;
          }
        } catch (error: any) {
          lastError = error;
          console.log(`[Auction] ${fn} attempt failed, trying next...`);
        }
      }
      
      if (success) {
        setActionMessage('Auction settled successfully!');
        // Store the settled auction's nounId before refetch
        const settledNounId = Number(auction.nounId);
        
        // Refetch to get the new auction
        await refetch();
        
        // Wait for the new auction data to be available
        // After settlement, a new auction is created with nounId = settledNounId + 1
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update viewNounId to show the new auction (the one that was just created)
        // The new auction will have nounId = settledNounId + 1
        setViewNounId(settledNounId + 1);
      } else {
        const errorMsg = lastError instanceof Error 
          ? lastError.message 
          : 'Failed to settle auction. Please check:\n1. Auction House contract is allowlisted in CDP\n2. settleAuction() and settleCurrentAndCreateNewAuction() functions are allowlisted\n3. You have a Coinbase Smart Wallet connected';
        throw new Error(errorMsg);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to settle auction';
      setActionMessage(null);
      setActionError(message);
      console.error('[Auction] Settlement failed:', error);
    } finally {
      setIsSettling(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  }, [auction, attemptSettle, isConnected, refetch, sponsoredTx.hasPaymasterSupport]);

  // If viewing the latest auction and it has ended, poll for the next one
  useEffect(() => {
    if (!isCurrentView || status !== 'ended') return;
    const interval = setInterval(() => {
      refetch();
    }, 15_000);
    return () => clearInterval(interval);
  }, [isCurrentView, status, refetch]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader view={currentView} onChange={onSelectView} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <AuctionHero
            auction={activeAuction}
            countdownMs={displayCountdown}
            onOpenBid={handleOpenBid}
            onSettle={handleSettle}
            isSettling={isSettling}
            isConnected={isConnected}
            onConnectWallet={handleConnectWallet}
            dateLabel={dateLabel}
            minRequiredWei={isCurrentView ? minRequiredWei : undefined}
            onPlaceBid={canBid ? handleBidSubmit : undefined}
            isCurrentView={isCurrentView}
            onPrev={handlePrev}
            onNext={handleNext}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            currentWalletAddress={address}
            statusOverride={derivedStatus}
          />

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="font-semibold text-gray-900 mb-2">Own an NFT</h3>
              <p className="text-sm text-gray-600">
                Win the auction to own a unique NFT with voting power
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">🗳️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Vote on Proposals</h3>
              <p className="text-sm text-gray-600">
                Use your NFT to vote on creator coin purchase proposals
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Support the DAO</h3>
              <p className="text-sm text-gray-600">
                Auction proceeds go directly to the DAO treasury
              </p>
            </div>
          </div>

          {bidModalOpen && auction && (
            <BidModal
              isOpen={bidModalOpen}
              nounId={auction.nounId}
              currentAmount={auction.amount}
              minRequiredWei={minRequiredWei}
              onDismiss={() => {
                setBidModalOpen(false);
                setActionError(null);
              }}
              onConfirm={handleBidSubmit}
              isSubmitting={bidSubmitting}
              errorMessage={actionError ?? undefined}
            />
          )}

          {(actionMessage || actionError) && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-sm">
              {actionMessage && <p className="font-medium">{actionMessage}</p>}
              {actionError && <p className="text-red-600">{actionError}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
