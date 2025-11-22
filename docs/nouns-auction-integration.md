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

## Contract Configuration

All contract addresses and chain configuration are centralized in `src/config/constants.ts`:

```typescript
export const CONTRACTS = {
  NFT: '0x626FbB71Ca4FE65F94e73AB842148505ae1a0B26',
  AUCTION_HOUSE: '0xe9609Fb710bDC6f88Aa5992014a156aeb31A6896',
  GOVERNOR: '0x9F530c7bCdb859bB1DcA3cD4EAE644f973A5f505',
  TREASURY: '0x3ed26c1d23Fd4Ea3B5e2077B60B4F1EC80Aba94f',
  METADATA: '0x82ACd8e6ea567d99B63fcFc21ec824b5D05C9744',
} as const;
```

The application is configured for **Base Sepolia testnet** (Chain ID 84532).

## Implementation Details

### Contract Data Interpretation

**Important:** The contract's `endTime` field actually contains the `startTime`. The actual `endTime` is calculated as `startTime + duration`.

```typescript
// Contract returns: { endTime: actualStartTime, ... }
const actualStartTime = contractEndTime;
const actualEndTime = actualStartTime + duration;
```

### Subgraph Integration

The application uses a **subgraph-first approach** for fetching auction data:

1. **Primary:** Query Builder DAO subgraph (configured via `VITE_BUILDER_DAO_SUBGRAPH_URL`)
2. **Fallback:** Read directly from contract if subgraph unavailable

The subgraph provides faster reads and includes historical auction data. See `src/lib/subgraph.ts` for implementation.

### NFT Image Rendering

The `NounImage` component (`src/components/NounImage.tsx`) fetches images by:
1. Reading `tokenURI` from the NFT contract
2. Parsing the metadata to extract image URL
3. Falling back to `noun.pics` if contract read fails

## Current Implementation

### ✅ Completed Features

1. **Auction Data Fetching**
   - `useAuction()` hook (`src/hooks/useAuction.ts`)
   - Subgraph integration with contract fallback
   - Automatic polling every 15 seconds
   - Time remaining calculation

2. **Auction Display**
   - `AuctionPage` component (`src/components/AuctionPage.tsx`)
   - `AuctionHero` component (`src/components/AuctionHero.tsx`)
   - Displays current bid, highest bidder, time remaining
   - NFT image rendering via `NounImage` component

3. **Bidding Functionality**
   - `BidModal` component for bid input
   - Transaction simulation before submission
   - Bid validation (minimum increment check)
   - Transaction status tracking

4. **Past Auction Navigation**
   - Navigate between current and past auctions
   - Previous/Next buttons
   - Fetches historical data from subgraph or contract settlements

5. **Auction Settlement**
   - Settle ended auctions
   - "Claim NFT" button for winners
   - "Start Next Auction" button for others
   - Automatic navigation to next auction after settlement

### Component Structure

- **AuctionPage**: Main page component managing auction state, navigation, bidding, and settlement
- **AuctionHero**: Visual auction card displaying NFT, bid info, countdown, and action buttons
- **NounImage**: Fetches and displays Noun NFT images
- **BidModal**: Modal for entering bid amounts

### Data Flow

1. `useAuction` hook fetches from subgraph (preferred) or contract
2. `AuctionPage` manages `viewNounId` for navigation
3. For past auctions, fetches from subgraph or `getSettlements` contract call
4. Bid submission uses `useWriteContract` with transaction simulation
5. Settlement uses `settleAuction` or `settleCurrentAndCreateNewAuction` functions

## Related Documentation

- [Subgraph API Reference](./api/subgraph.md) - Subgraph integration details
- [Wagmi API Reference](./api/wagmi.md) - Contract interaction hooks
- [Component Architecture](./architecture/components.md#auctionpage) - Component details
- [Data Flow](./architecture/data-flow.md#auction-data-flow) - Auction data flow

## Resources

- Nouns Builder Docs: https://docs.nouns.build/
- Wagmi useReadContract: https://wagmi.sh/react/hooks/useReadContract
- Wagmi useWriteContract: https://wagmi.sh/react/hooks/useWriteContract

