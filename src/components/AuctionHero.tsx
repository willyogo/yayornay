'use client';

import React, { useMemo, useState } from 'react';
import { Wallet, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { parseEther, formatEther } from 'viem';
import NounImage from './NounImage';
import { formatEth, getAuctionStatus, formatCountdown } from '../utils/auction';
import type { Auction } from '../config/contracts';
import { EnsName } from './EnsName';
import { useNftName } from '../hooks/useNftName';

interface AuctionHeroProps {
  auction?: Auction;
  countdownMs: number;
  onOpenBid: () => void;
  onSettle?: () => void;
  isSettling?: boolean;
  isConnected: boolean;
  onConnectWallet?: () => void;
  dateLabel?: string;
  minRequiredWei?: bigint;
  onPlaceBid?: (valueWei: bigint) => void;
  isCurrentView?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  currentWalletAddress?: `0x${string}`;
  statusOverride?: 'loading' | 'pending' | 'active' | 'ended';
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const AuctionHero: React.FC<AuctionHeroProps> = ({
  auction,
  countdownMs,
  onOpenBid,
  onSettle,
  isSettling = false,
  isConnected,
  onConnectWallet,
  dateLabel,
  minRequiredWei,
  onPlaceBid,
  isCurrentView = true,
  onPrev,
  onNext,
  canGoNext = false,
  canGoPrev = true,
  currentWalletAddress,
  statusOverride,
}) => {
  const { name: nftCollectionName, isLoading: isLoadingName } = useNftName();
  const baseStatus = statusOverride ?? getAuctionStatus(auction);
  const status =
    baseStatus !== 'ended' && !auction?.settled && countdownMs <= 0
      ? 'ended'
      : baseStatus;
  const nounId = auction ? Number(auction.nounId) : undefined;
  const hasBids = auction && auction.bidder !== ZERO_ADDRESS;
  const countdownLabel = formatCountdown(countdownMs);
  const etherLabel = auction ? formatEth(auction.amount, 3) : 'Loading';
  const isEnded = status === 'ended';
  const buttonDisabled = isEnded ? !auction || auction.settled || isSettling : status === 'pending' || !isConnected;

  const placeholderEth = useMemo(() => {
    if (!minRequiredWei) return '0.10';
    const eth = Number(minRequiredWei) / 1e18;
    const roundedUp = Math.ceil(eth * 100) / 100;
    return roundedUp.toFixed(2);
  }, [minRequiredWei]);

  const [copied, setCopied] = useState(false);
  const [bidInput, setBidInput] = useState('');
  const handleBidClick = () => {
    if (!onPlaceBid) return onOpenBid();
    try {
      const wei = parseEther((bidInput || '0') as `${number}`);
      onPlaceBid(wei);
    } catch {
      onOpenBid();
    }
  };

  const handleCopyBidder = async () => {
    if (!hasBids || !auction?.bidder) return;
    try {
      await navigator.clipboard.writeText(auction.bidder);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn('Failed to copy bidder address', err);
      setCopied(false);
    }
  };

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="absolute inset-0 flex items-center justify-center">
            {nounId !== undefined ? (
              <NounImage
                nounId={auction!.nounId}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/70 text-sm text-gray-500">
                <span>Fetching Noun...</span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />

          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-gray-800 shadow-md backdrop-blur">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status === 'active'
                    ? 'bg-emerald-500'
                    : status === 'pending'
                    ? 'bg-amber-400'
                    : status === 'ended'
                    ? 'bg-gray-500'
                    : 'bg-gray-400'
                }`}
                aria-hidden="true"
              />
              {status === 'ended' ? 'Auction ended' : status === 'pending' ? 'Auction starting soon' : status === 'active' ? 'Auction live' : 'Loading auction'}
            </span>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={!canGoPrev}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow-md backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                aria-label="Previous auction"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow-md backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                aria-label="Next auction"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">Auction</p>
              <h1 className="text-3xl font-bold text-gray-900">
                {nounId !== undefined ? `${nftCollectionName} #${nounId}` : 'Loading'}
              </h1>
              <p className="text-sm text-gray-500">{dateLabel || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              {auction?.settled && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Settled
                </span>
              )}
              {!isCurrentView && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Past auction
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={hasBids ? handleCopyBidder : undefined}
              disabled={!hasBids}
              className="rounded-2xl bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-gray-50"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {isCurrentView && !isEnded ? 'Highest bidder' : 'Winning bidder'}
              </p>
              <div className="mt-1 flex items-center gap-3">
                {hasBids ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <EnsName 
                        address={auction.bidder} 
                        className="text-2xl font-bold text-gray-900 truncate"
                        showAvatar={true}
                        avatarSize="sm"
                        shortStart={5}
                      />
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-semibold text-gray-900">No bids yet</span>
                )}
              </div>
              {copied && hasBids && (
                <p className="mt-1 text-xs text-gray-500">Winning bidder address copied</p>
              )}
            </button>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Current bid</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{etherLabel}</p>
            </div>
            {!isEnded || !isCurrentView ? (
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {isCurrentView ? 'Time left' : 'Ended'}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {isCurrentView
                    ? status === 'ended'
                      ? '00:00'
                      : countdownLabel
                    : dateLabel || '—'}
                </p>
              </div>
            ) : null}
          </div>

          {isCurrentView ? (
            status === 'ended' ? (
              <div className="flex flex-col gap-3">
                {auction && !auction.settled ? (
                  <button
                      type="button"
                      onClick={onSettle}
                      disabled={buttonDisabled}
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-base font-semibold text-white transition hover:scale-[1.01] hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/30"
                    >
                      {isSettling
                        ? 'Settling...'
                        : currentWalletAddress &&
                          auction.bidder &&
                          currentWalletAddress.toLowerCase() === auction.bidder.toLowerCase()
                        ? 'Claim NFT'
                        : 'Start Next Auction'}
                    </button>
                ) : (
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    Auction settled. Waiting for the next drop.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {!isConnected && onConnectWallet ? (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 text-base font-semibold text-white transition hover:shadow-lg hover:scale-[1.02]"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet to Bid
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <input
                          className="w-full rounded-xl bg-gray-100 px-4 py-3 pr-16 text-base font-semibold text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-gray-900/10"
                          placeholder={placeholderEth}
                          inputMode="decimal"
                          value={bidInput}
                          onChange={(e) => setBidInput(e.target.value)}
                          disabled={isEnded || !isConnected}
                          aria-label="Bid amount in ETH"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-gray-700 shadow">
                          ETH
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleBidClick}
                        disabled={isEnded || buttonDisabled || !bidInput}
                        className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-base font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/30 sm:w-auto"
                      >
                        Place Bid
                      </button>
                    </div>
                    {minRequiredWei && (
                      <button
                        type="button"
                        onClick={() => setBidInput(formatEther(minRequiredWei))}
                        className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                        aria-label="Click to auto-fill minimum bid"
                      >
                        Minimum bid: {formatEth(minRequiredWei, 3)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default AuctionHero;
