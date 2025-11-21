# Nouns DAO Auction Integration

## How Nouns Auctions Work

Nouns DAO uses a continuous auction system where:

- **New NFT auctioned every 24 hours** - A new Noun NFT is generated and auctioned at regular intervals
- **ETH bidding** - Participants bid using ETH (or native token on Base)
- **Highest bidder wins** - When the auction ends, the highest bidder receives the NFT
- **Proceeds to treasury** - All auction proceeds automatically go to the DAO treasury
- **Voting power** - Each NFT grants its owner one vote in DAO governance

## Nouns Builder Auction Contract Structure

Nouns Builder DAOs (like Gnars) deploy an auction contract that typically includes these functions:

### Key Functions to Query

- `auction()` - Returns current auction details (tokenId, highestBid, highestBidder, endTime, settled)
- `reservePrice()` - Minimum bid amount
- `minBidIncrementPercentage()` - Minimum percentage increase for new bids
- `timeBuffer()` - Time extension when bids come in near end
- `duration()` - Auction duration (typically 24 hours)

### Auction Data Structure

```typescript
interface Auction {
  nounId: bigint;           // Token ID being auctioned
  amount: bigint;           // Current highest bid (in wei)
  startTime: bigint;        // Auction start timestamp
  endTime: bigint;          // Auction end timestamp
  bidder: string;           // Current highest bidder address
  settled: boolean;         // Whether auction has been settled
}
```

## Integration Approach

### 1. Query Auction Contract

Using Wagmi's `useReadContract` hook to read auction data:

- Contract address: The DAO's auction contract address (separate from governance contract)
- ABI: Nouns Builder auction contract ABI
- Function: `auction()` to get current auction state

### 2. Calculate Time Remaining

- Get current block timestamp
- Compare with auction `endTime`
- Display countdown timer

### 3. Display Auction Information

The landing page auction component should show:

- **NFT Image** - Render the Noun NFT image (tokenId from auction)
- **Current Bid** - Display highest bid amount in ETH
- **Time Remaining** - Countdown timer to auction end
- **Bidder Address** - Current highest bidder (shortened)
- **Place Bid Button** - Allow users to bid (if wallet connected)

### 4. NFT Image Rendering

Nouns NFTs are generated on-chain. Options for displaying:

- **SVG Renderer** - Use Nouns Builder's SVG renderer to generate image from traits
- **IPFS/Arweave** - If metadata is stored off-chain
- **Nouns API** - Use Nouns Builder API if available for Base

## Gnars DAO Specifics

For Gnars DAO on Base (0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17):

- Need to find the auction contract address (separate from governance)
- Check if Gnars uses standard Nouns Builder auction contract
- Verify auction interval (may not be exactly 24 hours)

## Implementation Steps

1. **Find Auction Contract Address**
   - Check Gnars DAO on nouns.build
   - Look for auction contract in DAO deployment
   - May need to query governance contract for auction address

2. **Create Auction Hook**
   - `useAuction()` hook using `useReadContract`
   - Poll for updates every few seconds
   - Calculate time remaining

3. **Create Auction Component**
   - Display auction card on landing page
   - Show NFT preview, bid amount, countdown
   - Place bid functionality (future)

4. **Handle Bidding** (Future)
   - Use `useWriteContract` to place bids
   - Handle bid validation (minimum increment)
   - Show transaction status

## Current State

- No auction integration exists yet
- Wagmi is configured and ready for contract reads
- Landing page is a good place to add auction display
- Need to identify auction contract address for Gnars DAO

## Resources

- Nouns Builder Docs: https://docs.nouns.build/
- Gnars DAO: https://nouns.build/dao/base/0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17/
- Wagmi useReadContract: https://wagmi.sh/react/hooks/useReadContract

