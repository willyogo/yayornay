# State Management

## State Management Strategy

The application uses a hybrid approach combining multiple state management patterns: server state from external APIs (Supabase, Zora), client state for UI and component state, and blockchain state managed internally by Wagmi.

## Server State (Proposals)

The useProposals hook uses useState and useEffect for data fetching. When called, it creates state for proposals, loading, and error. The useEffect runs when test mode changes, using a subgraph-first approach: it first tries to fetch from Builder DAO subgraph, then falls back to Supabase if subgraph is unavailable. If test mode is enabled and no data is available, it returns mock proposals. This approach means there is no caching, so proposals refetch on every component mount. There is no background refetching, optimistic updates, or error retry logic.

React Query is configured in main.tsx with a QueryClientProvider wrapping the app, but it is not actively used for data fetching. The hooks use useState instead.

## Server State (Auctions)

The `useAuction` hook manages auction data with a subgraph-first approach:

**Subgraph State:**
- `subgraphAuction`: Current auction data from subgraph (preferred source)
- `subgraphLoading`: Loading state for subgraph queries
- Automatic polling every 15 seconds to refresh auction data

**Contract State:**
- Uses `useReadContract` to read auction data, reserve price, duration, and min increment percentage
- `contractLoading`: Loading state for contract reads
- Serves as fallback when subgraph unavailable

**Derived State:**
- `auction`: Combined auction data (prefers subgraph, falls back to contract)
- `status`: Auction status (pending, active, ended) calculated from timestamps
- `countdown`: Time remaining in milliseconds, updated every second
- `minRequiredWei`: Minimum bid amount calculated from current bid and increment percentage

**State Updates:**
- Subgraph data refreshes every 15 seconds via `setInterval`
- Countdown updates every second via `setInterval`
- Contract data refetches when `refetch()` is called (e.g., after bid submission)

The `AuctionPage` component manages additional auction-related state:

**Navigation State:**
- `viewNounId`: Currently displayed auction nounId (null = current auction)
- `displayAuction`: Auction data to display (current or past auction)
- `displayCountdown`: Countdown timer for displayed auction

**Bidding State:**
- `bidModalOpen`: Whether bid modal is visible
- `bidSubmitting`: Whether bid transaction is in progress
- `actionMessage`: Success/info messages
- `actionError`: Error messages
- `txHash`: Transaction hash for block explorer link

**Settlement State:**
- `isSettling`: Whether settlement transaction is in progress

**State Coordination:**
- When `viewNounId` changes, `displayAuction` is updated via `useEffect`
- For past auctions, fetches from subgraph or contract `getSettlements`
- For current auction, uses data from `useAuction` hook
- After settlement, automatically navigates to next auction (`viewNounId = settledNounId + 1`)

## Client State (UI)

Component-level state uses local useState hooks for UI state that doesn't need to be shared. SwipeStack manages currentIndex for the card stack position, dragOffset for drag position, isDragging for drag state, and similar UI-specific state.

**AuctionPage UI State:**
- `bidModalOpen`: Controls bid modal visibility
- `bidSubmitting`: Loading state during bid submission
- `isSettling`: Loading state during settlement
- `actionMessage` / `actionError`: User feedback messages
- `txHash`: Transaction hash for display and block explorer links

**AuctionHero UI State:**
- `bidInput`: User-entered bid amount (string)
- Manages bid input validation and submission

Global state uses React Context API for the test mode toggle. The TestModeContext is created in App.tsx and provides testMode boolean and setTestMode function. This is used by App to control test mode, LandingPage to display the toggle, and SwipeStack to skip actual vote submission when enabled.

**View State:**
- `App.tsx` manages `view` state using `AppView` type ('landing' | 'auction' | 'submit')
- `previousViewRef`: Tracks view before wallet connection to return users after login
- View state controls which main component is rendered

## Blockchain State (Wagmi)

Wagmi manages blockchain-related state internally. Components use Wagmi hooks like useAccount to get wallet address and connection status, useConnect to connect wallets, and useDisconnect to disconnect. Wagmi tracks wallet connection status, connected address, chain information, and transaction state. This state updates in real-time and Wagmi persists wallet connections in localStorage.

## State Flow

User actions trigger component event handlers, which call custom hooks like useVoting or useProposals. These hooks either update local useState or make calls to external services. State updates trigger React re-renders.

## State Management Patterns

State is lifted up to common ancestors when multiple components need it. App manages selectedProposal state and passes setSelectedProposal down to SwipeStack via onDetailClick callback, then uses it to conditionally render CreatorFeedModal.

Custom hooks encapsulate state logic. `useProposals` manages proposal fetching state and logic, returning proposals, loading, and error to components. `useAuction` manages auction data fetching, polling, and derived state like countdown and minimum bid.

Context API provides global state. TestModeContext makes test mode available to any component that needs it without prop drilling.

**Auction State Patterns:**
- `useAuction` hook centralizes auction data fetching and processing
- `AuctionPage` manages view-specific state (which auction to display, navigation)
- `AuctionHero` receives auction data as props and manages only UI state (bid input)
- State flows down via props, events flow up via callbacks
- Navigation state (`viewNounId`) controls which auction data to fetch and display

## State Persistence

Currently, there is no persistence for most state - all state is in-memory and resets on page reload. Wagmi persists wallet connection in localStorage automatically. Test mode resets on page reload.

## Performance Considerations

The application uses minimal re-renders through local state management and conditional rendering with early returns. Memoization is used selectively:

**useMemo Usage:**
- `dateLabel` in `AuctionPage`: Memoized date formatting to prevent recalculation
- `minRequiredWei` in `useAuction`: Memoized minimum bid calculation
- `auction` in `useAuction`: Memoized auction data transformation

**useCallback Usage:**
- `handlePrev`, `handleNext` in `AuctionPage`: Memoized navigation callbacks
- `handleBidSubmit`, `handleSettle` in `AuctionPage`: Memoized action handlers
- `refetch` in `useAuction`: Memoized refetch function

**Polling Optimization:**
- Subgraph polling uses 15-second intervals (not too frequent)
- Countdown updates use 1-second intervals (smooth UI)
- Polling intervals are cleaned up properly in `useEffect` return functions

## Related Documentation

- [Architecture Overview](./overview.md) - System architecture
- [Component Architecture](./components.md) - Component structure
- [Data Flow](./data-flow.md) - Data flow patterns
