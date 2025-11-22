'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useConnect } from 'wagmi';
import { waitForTransactionReceipt, simulateContract } from 'wagmi/actions';
import { config } from '../lib/wagmi';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { parseEther } from 'viem';
import { useAuction } from '../hooks/useAuction';
import { CONTRACTS, AUCTION_HOUSE_ABI, type Auction } from '../config/contracts';
import AuctionHero from './AuctionHero';
import BidModal from './BidModal';
import { getAuctionStatus } from '../utils/auction';
import { fetchAuctionById, isSubgraphConfigured } from '../lib/subgraph';
import { AppHeader } from './AppHeader';

interface AuctionPageProps {
  onSelectView: (view: 'landing' | 'auction') => void;
  currentView: 'landing' | 'auction';
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export function AuctionPage({ onSelectView, currentView }: AuctionPageProps) {
  const { isConnected, address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const {
    auction,
    currentBid,
    currentBidRaw,
    currentBidder,
    nounId,
    settled,
    reservePrice,
    reservePriceWei,
    minIncrementPct,
    duration,
    minRequiredWei,
    status,
    isLoading,
    refetch,
  } = useAuction();

  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [viewNounId, setViewNounId] = useState<number | null>(null);
  const [displayAuction, setDisplayAuction] = useState<Auction | undefined>();
  const [displayCountdown, setDisplayCountdown] = useState(0);

  const { writeContractAsync } = useWriteContract();

  // Update viewNounId when current auction changes (only if not viewing a past auction)
  useEffect(() => {
    if (!auction) return;
    const currentNounId = Number(auction.nounId);
    
    // Only auto-update if:
    // 1. viewNounId is null (initial load)
    // 2. viewNounId is >= currentNounId (viewing current or future auction)
    // Don't override if user is viewing a past auction (viewNounId < currentNounId)
    setViewNounId((prev) => {
      if (prev == null) {
        setDisplayAuction(auction);
        return currentNounId;
      }
      // If viewing current or future auction, update to current
      if (prev >= currentNounId) {
        setDisplayAuction(auction);
        return currentNounId;
      }
      // Otherwise, keep the past auction view (don't update displayAuction here)
      return prev;
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

    // Fetch past auction (prefer subgraph, fallback to contract settlements)
    (async () => {
      try {
        // Try subgraph first (matching original component approach)
        if (isSubgraphConfigured()) {
          const sg = await fetchAuctionById(viewNounId);
          if (sg) {
            setDisplayAuction({
              nounId: BigInt(sg.id),
              amount: BigInt(sg.amount),
              startTime: BigInt(sg.startTime),
              endTime: BigInt(sg.endTime),
              bidder: (sg.bidder?.id ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
              settled: Boolean(sg.settled),
            });
            return;
          }
        }

        // Fallback to contract settlements if subgraph unavailable or no data
        const settlementData = await publicClient.readContract({
          address: CONTRACTS.AUCTION_HOUSE,
          abi: AUCTION_HOUSE_ABI,
          functionName: 'getSettlements',
          args: [BigInt(viewNounId), BigInt(viewNounId), true],
        });

        if (settlementData && Array.isArray(settlementData) && settlementData.length > 0) {
          const settlement = settlementData[0] as any;
          const settlementTime = BigInt(settlement.blockTimestamp);
          
          setDisplayAuction({
            nounId: BigInt(viewNounId),
            amount: BigInt(settlement.amount),
            startTime: settlementTime,
            endTime: settlementTime,
            bidder: settlement.winner as `0x${string}`,
            settled: true,
          });
        } else {
          // No data found
          setDisplayAuction({
            nounId: BigInt(viewNounId),
            amount: 0n,
            startTime: 0n,
            endTime: 0n,
            bidder: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            settled: false,
          });
        }
      } catch {
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
  }, [viewNounId, auction, publicClient]);

  // Update countdown for display auction
  useEffect(() => {
    if (!displayAuction || displayAuction.endTime === 0n) {
      setDisplayCountdown(0);
      return;
    }
    
    const updateCountdown = () => {
      const endTimeMs = Number(displayAuction.endTime) * 1000;
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

  const activeAuction = displayAuction ?? auction;

  const handlePrev = useCallback(() => {
    if (viewNounId == null) return;
    setViewNounId(Math.max(0, viewNounId - 1));
  }, [viewNounId]);

  const handleNext = useCallback(() => {
    if (viewNounId == null || !auction) return;
    if (viewNounId >= Number(auction.nounId)) return;
    setViewNounId(viewNounId + 1);
  }, [viewNounId, auction]);

  const canGoNext = auction ? (viewNounId ?? 0) < Number(auction.nounId) : false;
  const canGoPrev = viewNounId != null && viewNounId > 0;
  const isCurrentView = viewNounId === (auction ? Number(auction.nounId) : null);

  const dateLabel = useMemo(() => {
    if (!activeAuction || !activeAuction.startTime || activeAuction.startTime === 0n) {
      // Return a placeholder to prevent layout shift
      return '—';
    }
    const timestamp = Number(activeAuction.startTime) * 1000;
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

  const backgroundHex = '#f0f0ff'; // Default background color
  const isAuctionActive = status === 'active';
  const canBid = isConnected && isAuctionActive && !settled && auction !== undefined && isCurrentView;

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
        setActionMessage('Waiting for wallet signature...');

        // Try to simulate first
        let hash: `0x${string}` | undefined;
        try {
          const simulation = await simulateContract(config, {
            address: CONTRACTS.AUCTION_HOUSE,
            abi: AUCTION_HOUSE_ABI,
            functionName: 'createBid',
            args: [auction.nounId],
            value: valueWei,
            account: address!,
          });
          setActionMessage('Transaction submitted. Waiting for confirmation...');
          hash = await writeContractAsync(simulation.request);
        } catch {
          // Fallback to direct write if simulation fails
          setActionMessage('Submitting transaction...');
          hash = await writeContractAsync({
            address: CONTRACTS.AUCTION_HOUSE,
            abi: AUCTION_HOUSE_ABI,
            functionName: 'createBid',
            args: [auction.nounId],
            value: valueWei,
          });
        }

        if (!hash) throw new Error('No transaction hash');

        setTxHash(hash);
        const receipt = await waitForTransactionReceipt(config, {
          hash,
          timeout: 60_000,
        });

        if (receipt.status === 'success') {
          setActionMessage('Bid confirmed!');
          setBidModalOpen(false);
          await refetch();
        } else {
          setActionError('Bid transaction failed');
        }
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
    [auction, isConnected, address, writeContractAsync, refetch]
  );

  const attemptSettle = useCallback(
    async (fnName: 'settleAuction' | 'settleCurrentAndCreateNewAuction') => {
      if (!auction) return null;
      try {
        const simulation = await simulateContract(config, {
          address: CONTRACTS.AUCTION_HOUSE,
          abi: AUCTION_HOUSE_ABI,
          functionName: fnName,
          args: [],
          account: address!,
        });
        const hash = await writeContractAsync(simulation.request);
        setTxHash(hash);
        const receipt = await waitForTransactionReceipt(config, { hash });
        return receipt.status;
      } catch (error: any) {
        // If simulation fails, the function likely can't be called
        // This helps us determine which settle function to use
        throw error;
      }
    },
    [auction, address, writeContractAsync]
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
      setActionMessage('Submitting settle transaction...');
      
      // Try settleAuction first (for ended auctions)
      const attempts: ('settleAuction' | 'settleCurrentAndCreateNewAuction')[] = [
        'settleAuction',
        'settleCurrentAndCreateNewAuction',
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
        }
      }
      if (success) {
        setActionMessage('Auction settled!');
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
          : 'Failed to settle auction. The auction may not be ready to settle yet.';
        throw new Error(errorMsg);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to settle auction';
      setActionMessage(null);
      setActionError(message);
    } finally {
      setIsSettling(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  }, [auction, attemptSettle, isConnected, refetch]);

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
            backgroundHex={backgroundHex}
            minRequiredWei={isCurrentView ? minRequiredWei : undefined}
            onPlaceBid={canBid ? handleBidSubmit : undefined}
            isCurrentView={isCurrentView}
            onPrev={handlePrev}
            onNext={handleNext}
            canGoNext={canGoNext}
            currentWalletAddress={address}
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

          {(actionMessage || actionError || txHash) && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-sm">
              {actionMessage && <p className="font-medium">{actionMessage}</p>}
              {actionError && <p className="text-red-600">{actionError}</p>}
              {txHash && (
                <p className="text-xs text-muted-foreground">
                  Tx hash:{' '}
                  <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {txHash.slice(0, 10)}...
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
