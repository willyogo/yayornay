# State Management

## State Management Strategy

The application uses a hybrid approach combining multiple state management patterns: server state from external APIs (Supabase, Zora), client state for UI and component state, and blockchain state managed internally by Wagmi.

## Server State (Proposals)

The useProposals hook uses useState and useEffect for data fetching. When called, it creates state for proposals, loading, and error. The useEffect runs when test mode changes, either returning mock proposals immediately or querying Supabase. This approach means there is no caching, so proposals refetch on every component mount. There is no background refetching, optimistic updates, or error retry logic.

React Query is configured in main.tsx with a QueryClientProvider wrapping the app, but it is not actively used for data fetching. The hooks use useState instead.

## Client State (UI)

Component-level state uses local useState hooks for UI state that doesn't need to be shared. SwipeStack manages currentIndex for the card stack position, dragOffset for drag position, isDragging for drag state, and similar UI-specific state.

Global state uses React Context API for the test mode toggle. The TestModeContext is created in App.tsx and provides testMode boolean and setTestMode function. This is used by App to control test mode, LandingPage to display the toggle, and SwipeStack to skip actual vote submission when enabled.

## Blockchain State (Wagmi)

Wagmi manages blockchain-related state internally. Components use Wagmi hooks like useAccount to get wallet address and connection status, useConnect to connect wallets, and useDisconnect to disconnect. Wagmi tracks wallet connection status, connected address, chain information, and transaction state. This state updates in real-time and Wagmi persists wallet connections in localStorage.

## State Flow

User actions trigger component event handlers, which call custom hooks like useVoting or useProposals. These hooks either update local useState or make calls to external services. State updates trigger React re-renders.

## State Management Patterns

State is lifted up to common ancestors when multiple components need it. App manages selectedProposal state and passes setSelectedProposal down to SwipeStack via onDetailClick callback, then uses it to conditionally render CreatorFeedModal.

Custom hooks encapsulate state logic. useProposals manages proposal fetching state and logic, returning proposals, loading, and error to components.

Context API provides global state. TestModeContext makes test mode available to any component that needs it without prop drilling.

## State Persistence

Currently, there is no persistence for most state - all state is in-memory and resets on page reload. Wagmi persists wallet connection in localStorage automatically. Test mode resets on page reload.

## Performance Considerations

The application uses minimal re-renders through local state management and conditional rendering with early returns. There is no memoization using useMemo or useCallback currently.

## Related Documentation

- [Architecture Overview](./overview.md) - System architecture
- [Component Architecture](./components.md) - Component structure
- [Data Flow](./data-flow.md) - Data flow patterns
