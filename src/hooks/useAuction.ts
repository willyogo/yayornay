import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, AUCTION_HOUSE_ABI, type Auction } from '../config/contracts';
import { formatEth, getAuctionStatus, formatCountdown } from '../utils/auction';
import { fetchLatestAuction, isSubgraphConfigured } from '../lib/subgraph';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function useAuction() {
  const [subgraphAuction, setSubgraphAuction] = useState<Auction | undefined>();
  const [subgraphLoading, setSubgraphLoading] = useState(true);

  // Try subgraph first (matching original component approach)
  useEffect(() => {
    if (!isSubgraphConfigured()) {
      setSubgraphLoading(false);
      return;
    }

    let mounted = true;
    const loadSubgraph = async () => {
      try {
        const sg = await fetchLatestAuction();
        if (!mounted) return;
        if (sg) {
          // Use winningBid for settled auctions, highestBid for active auctions
          const bidAmount = sg.winningBid?.amount ?? sg.highestBid?.amount ?? '0';
          const bidderAddress = sg.winningBid?.bidder ?? sg.highestBid?.bidder ?? '0x0000000000000000000000000000000000000000';
          
          // Parse the subgraph ID format: "daoAddress:tokenId"
          const tokenId = sg.id.includes(':') ? sg.id.split(':')[1] : sg.id;
          
          setSubgraphAuction({
            nounId: BigInt(tokenId),
            amount: BigInt(bidAmount),
            startTime: BigInt(sg.startTime),
            endTime: BigInt(sg.endTime),
            bidder: bidderAddress as `0x${string}`,
            settled: Boolean(sg.settled),
          });
        }
      } catch (error) {
        console.warn('Failed to load auction from subgraph, falling back to on-chain', error);
      } finally {
        if (mounted) setSubgraphLoading(false);
      }
    };

    loadSubgraph();
    const interval = setInterval(loadSubgraph, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const { data: auctionData, isLoading: contractLoading, error, refetch } = useReadContract({
    address: CONTRACTS.AUCTION_HOUSE,
    abi: AUCTION_HOUSE_ABI,
    functionName: 'auction',
    query: {
      refetchInterval: 15000, // Refetch every 15 seconds
    },
  });

  const { data: reservePrice } = useReadContract({
    address: CONTRACTS.AUCTION_HOUSE,
    abi: AUCTION_HOUSE_ABI,
    functionName: 'reservePrice',
  });

  const { data: minIncrementPct } = useReadContract({
    address: CONTRACTS.AUCTION_HOUSE,
    abi: AUCTION_HOUSE_ABI,
    functionName: 'minBidIncrementPercentage',
  });

  const { data: duration } = useReadContract({
    address: CONTRACTS.AUCTION_HOUSE,
    abi: AUCTION_HOUSE_ABI,
    functionName: 'duration',
  });

  // Parse contract auction data
  const contractAuction: Auction | undefined = useMemo(() => {
    if (!auctionData) return undefined;

    try {
      const obj = auctionData as any;
      const rawEnd = BigInt(obj.endTime ?? 0); // holds startTime in Builder contracts
      const rawStart = BigInt(obj.startTime ?? 0);
      const startTime = rawEnd > 0n ? rawEnd : rawStart;
      const durationVal = typeof duration === 'bigint' ? duration : 0n;
      const endTime =
        durationVal > 0n && startTime > 0n
          ? startTime + durationVal
          : rawStart > 0n
          ? rawStart
          : rawEnd;

      return {
        nounId: BigInt(obj.nounId ?? 0),
        amount: BigInt(obj.amount ?? 0),
        startTime,
        endTime,
        bidder: (obj.bidder ?? ZERO_ADDRESS) as `0x${string}`,
        settled: Boolean(obj.settled),
      };
    } catch {
      return auctionData as Auction;
    }
  }, [auctionData, duration]);

  // Prefer contract timing data when nounIds match; otherwise pick the latest nounId
  const auction: Auction | undefined = useMemo(() => {
    if (contractAuction && subgraphAuction) {
      if (contractAuction.nounId === subgraphAuction.nounId) {
        const subgraphBidder =
          subgraphAuction.bidder && subgraphAuction.bidder !== ZERO_ADDRESS
            ? subgraphAuction.bidder
            : undefined;
        const subgraphAmount =
          subgraphAuction.amount && subgraphAuction.amount > 0n
            ? subgraphAuction.amount
            : undefined;
        const mergedStart =
          subgraphAuction.startTime && subgraphAuction.startTime > 0n
            ? subgraphAuction.startTime
            : contractAuction.startTime;
        const mergedEnd =
          subgraphAuction.endTime && subgraphAuction.endTime > 0n
            ? subgraphAuction.endTime
            : contractAuction.endTime;

        return {
          ...contractAuction,
          bidder: subgraphBidder ?? contractAuction.bidder,
          amount: subgraphAmount ?? contractAuction.amount,
          startTime: mergedStart,
          endTime: mergedEnd,
          settled: Boolean(contractAuction.settled || subgraphAuction.settled),
        };
      }
      return contractAuction.nounId > subgraphAuction.nounId
        ? contractAuction
        : subgraphAuction;
    }

    return contractAuction ?? subgraphAuction;
  }, [contractAuction, subgraphAuction]);
  const [countdown, setCountdown] = useState(0);

  // Update countdown every second
  useEffect(() => {
    if (!auction) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const endTimeSec = Number(auction.endTime);
      if (!Number.isFinite(endTimeSec)) {
        setCountdown(0);
        return;
      }
      const remaining = Math.max(0, endTimeSec * 1000 - Date.now());
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [auction]);

  // Calculate minimum required bid
  const minRequiredWei = useMemo(() => {
    if (!auction) return undefined;
    const pct = typeof minIncrementPct === 'number' ? minIncrementPct : 5;
    if (auction.amount === 0n) {
      return (reservePrice ?? 0n) || undefined;
    }
    const increment = (auction.amount * BigInt(pct) + 99n) / 100n; // round up
    return auction.amount + increment;
  }, [auction, minIncrementPct, reservePrice]);

  const status = getAuctionStatus(auction);
  const countdownLabel = formatCountdown(countdown);
  const etherLabel = auction ? formatEth(auction.amount, 3) : '0 ETH';
  const isLoading = subgraphLoading || contractLoading;

  return {
    auction,
    currentBid: etherLabel,
    currentBidRaw: auction?.amount ?? 0n,
    countdown,
    countdownLabel,
    timeRemainingFormatted: countdownLabel,
    currentBidder: auction?.bidder,
    nounId: auction?.nounId,
    settled: auction?.settled ?? false,
    reservePrice: reservePrice ? formatEth(reservePrice) : '0',
    reservePriceWei: reservePrice ?? 0n,
    minIncrementPct: typeof minIncrementPct === 'number' ? minIncrementPct : 5,
    minRequiredWei,
    status,
    isLoading,
    error,
    refetch: useCallback(async () => {
      // Refetch both subgraph and contract
      if (isSubgraphConfigured()) {
        try {
          const sg = await fetchLatestAuction();
          if (sg) {
            // Use winningBid for settled auctions, highestBid for active auctions
            const bidAmount = sg.winningBid?.amount ?? sg.highestBid?.amount ?? '0';
            const bidderAddress = sg.winningBid?.bidder ?? sg.highestBid?.bidder ?? '0x0000000000000000000000000000000000000000';
            
            // Parse the subgraph ID format: "daoAddress:tokenId"
            const tokenId = sg.id.includes(':') ? sg.id.split(':')[1] : sg.id;
            
            setSubgraphAuction({
              nounId: BigInt(tokenId),
              amount: BigInt(bidAmount),
              startTime: BigInt(sg.startTime),
              endTime: BigInt(sg.endTime),
              bidder: bidderAddress as `0x${string}`,
              settled: Boolean(sg.settled),
            });
          }
        } catch (error) {
          console.warn('Failed to refetch from subgraph', error);
        }
      }
      return refetch();
    }, [refetch]),
  };
}
