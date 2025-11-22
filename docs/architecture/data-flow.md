# Data Flow

## Proposal Loading Flow

When the App component mounts, it calls the useProposals hook with the test mode flag. The hook's useEffect triggers fetchProposals. The hook implements a subgraph-first approach:

1. **Subgraph Query (Preferred)**:
   - Calls `fetchActiveProposalsFromSubgraph()` from `src/lib/yaynaySubgraph.ts`
   - Queries GraphQL for active proposals matching the DAO address
   - Transforms subgraph proposals to `Proposal` type
   - Uses proposals if found

2. **Fallback Options**:
   - If subgraph returns no proposals and test mode enabled: Returns mock proposals
   - If subgraph unavailable or returns no proposals: Falls back to Supabase query
   - Supabase query matches configured DAO address with active status, ordered by creation date descending

3. **State Update**: Proposals are stored in state and passed to SwipeStack as props. SwipeStack renders a ProposalCard for the proposal at the current index.

## Voting Flow

When a user swipes a card or clicks a vote button, SwipeStack calls handleVote with the vote type. The animation starts by setting isAnimatingOut to true. It then calls the onVote callback with the proposal ID and vote type. The useVoting hook's submitVote function checks that a wallet is connected, then inserts a vote record into Supabase with the proposal ID, voter address from Wagmi (lowercased), vote type, hardcoded voting power of 1, and a mock transaction hash generated from the current timestamp. After handling any errors, there's a 400ms delay before moving to the next card and resetting the card position.

Currently, votes do not create actual blockchain transactions. The transaction hash is a mock value. Voting power is hardcoded to 1 and not calculated from NFT holdings. Duplicate vote prevention relies on the database unique constraint on proposal_id and voter_address.

## Creator Feed Flow

When a user clicks a ProposalCard, App sets the selected proposal in state. This causes CreatorFeedModal to mount with the proposal prop. A useEffect triggers loadCreatorTokens which calls getCreatorProfile with the creator address. This makes a GraphQL query to Zora API for tokens owned by that address, transforms the response into CreatorToken objects, and stores them in state. The component then renders a grid of tokens or an empty state if none are found.

## Auction Data Flow

### Current Auction Loading

When `AuctionPage` mounts, it calls the `useAuction` hook. The hook implements a subgraph-first approach:

1. **Subgraph Query (Preferred)**: 
   - Checks if subgraph is configured via `VITE_BUILDER_DAO_SUBGRAPH_URL`
   - Calls `fetchLatestAuction()` from `src/lib/subgraph.ts`
   - Queries GraphQL for the latest auction ordered by `startTime` descending
   - Transforms subgraph response to `Auction` type
   - Sets up polling every 15 seconds to refresh data

2. **Contract Fallback**:
   - If subgraph unavailable or returns no data, falls back to contract reads
   - Uses `useReadContract` to call `auction()` function on auction house contract
   - Also reads `reservePrice`, `minBidIncrementPercentage`, and `duration`
   - Parses contract response, handling the quirk where `endTime` field contains `startTime`
   - Calculates actual `endTime` as `startTime + duration`

3. **Data Processing**:
   - Combines subgraph/contract data with contract configuration (reserve price, duration, etc.)
   - Calculates minimum required bid based on current bid and increment percentage
   - Determines auction status (pending, active, ended) based on timestamps
   - Calculates countdown timer from `endTime` to current time

### Past Auction Navigation

When user navigates to a past auction (via Previous/Next buttons):

1. **View Noun ID Update**: `AuctionPage` updates `viewNounId` state
2. **Data Fetching**:
   - If viewing current auction (`viewNounId === currentNounId`), uses current auction data
   - Otherwise, fetches past auction data:
     - **Subgraph First**: Calls `fetchAuctionById(viewNounId)` from subgraph
     - **Contract Fallback**: Uses `getSettlements` contract function to get settlement data
     - Creates `displayAuction` object from fetched data
3. **Display Update**: `AuctionHero` receives `displayAuction` and renders past auction info

### Bidding Flow

When a user places a bid:

1. **Bid Input**: User enters bid amount in `BidModal` or `AuctionHero` bid input
2. **Validation**: 
   - Checks wallet is connected
   - Validates bid amount meets minimum increment requirement
   - Simulates transaction using `simulateContract` from Wagmi
3. **Transaction Submission**:
   - Calls `useWriteContract` with `createBid` function
   - Includes `nounId` and `value` (bid amount in wei)
   - Waits for transaction receipt
4. **State Update**:
   - On success, calls `refetch()` to update auction data
   - Shows success message and closes bid modal
   - Updates transaction hash for block explorer link
5. **Error Handling**: Displays error message if transaction fails

### Settlement Flow

When an auction ends and user clicks settle button:

1. **Validation**:
   - Checks auction status is 'ended'
   - Verifies auction is not already settled
   - Ensures wallet is connected
2. **Settlement Attempt**:
   - Tries `settleAuction()` function first
   - If that fails, tries `settleCurrentAndCreateNewAuction()`
   - Uses transaction simulation to determine which function works
3. **Button Text Logic**:
   - If current wallet address matches `auction.bidder`: Shows "Claim NFT"
   - Otherwise: Shows "Start Next Auction"
4. **Post-Settlement**:
   - On success, refetches auction data
   - Waits for new auction to be available
   - Automatically navigates to next auction (`viewNounId = settledNounId + 1`)
   - Shows success message

### NFT Image Loading

When `NounImage` component mounts:

1. **Token URI Fetch**: Reads `tokenURI(nounId)` from NFT contract
2. **Metadata Parse**: Parses JSON metadata to extract image URL
3. **Image Display**: Renders image, or falls back to `noun.pics` if contract read fails
4. **Error Handling**: Shows placeholder if image fails to load

## State Update Flow

User actions trigger component event handlers, which call custom hooks like useVoting or useProposals. These hooks either update local useState or make calls to external services like Supabase or Zora. State updates trigger React re-renders, which update the UI.

## Data Sources

**Supabase** serves as the primary database, storing proposals and votes. Proposals are queried on component mount with no caching, so they refetch every time. Votes are inserted when users submit votes. However, proposals now prefer subgraph data when available (see Proposal Loading Flow).

**Subgraph** (Builder DAO Subgraph) provides auction and proposal data via GraphQL:
- Auction data is fetched from subgraph first, with contract fallback
- Proposals are fetched from subgraph first, with Supabase fallback
- Configured via `VITE_BUILDER_DAO_SUBGRAPH_URL` environment variable
- Provides faster reads and historical data access

**Wagmi** manages blockchain state including wallet connection status, connected address, and chain information. This state updates in real-time as managed internally by Wagmi and persists wallet connections in localStorage. Wagmi also provides contract read/write capabilities via `useReadContract` and `useWriteContract` hooks.

**Contract Reads** (via Wagmi/Viem) provide real-time auction data:
- Reads from auction house contract for current auction state
- Reads settlement data for past auctions
- Used as fallback when subgraph unavailable

**Zora API** provides creator profile and token data through GraphQL queries. Creator tokens are fetched when the modal opens, with no caching, so they refetch every time the modal is opened.

## Data Flow Patterns

The application uses unidirectional data flow where data flows down via props and events flow up via callbacks. Parent components pass data down to children, and children notify parents through callback functions.

Async data loading uses useEffect hooks that call async functions when dependencies change. These functions fetch data, update state, and handle errors.

Error handling uses try-catch blocks in async functions. Errors are caught, logged, and state is updated accordingly, with loading states managed in finally blocks.

## Related Documentation

- [Architecture Overview](./overview.md) - System architecture
- [Component Architecture](./components.md) - Component structure
- [State Management](./state-management.md) - State patterns
- [API Reference](../api/) - External API documentation
