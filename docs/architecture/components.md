# Component Architecture

## Component Hierarchy

The application renders a strict mode wrapper containing WagmiProvider for blockchain context and QueryClientProvider for React Query. Inside these providers, the App component conditionally renders either LandingPage (when wallet is not connected) or SwipeStack (when connected). LandingPage contains WalletConnect. SwipeStack displays ProposalCard components in a stack with action buttons. CreatorFeedModal renders conditionally when a proposal is selected.

## Component Responsibilities

### App.tsx
The root component handles route logic by checking wallet connection status. It coordinates global state, composes providers, and initializes the Farcaster SDK. It conditionally renders LandingPage when not connected, a loading spinner when loading, or SwipeStack when ready. It manages test mode through Context and tracks the selected proposal for modal display.

### SwipeStack.tsx
This component handles gesture recognition using pointer and touch events. It manages card animation state, detects vote thresholds based on drag distance, and manages the card stack by tracking the current index. It uses the Pointer Capture API for precise gesture control, handles drag start/move/end events, calculates vote intent based on drag distance, and manages card fly-out animations. State includes currentIndex for tracking position in the stack, dragOffset for current drag position, isDragging for active drag state, isAnimatingOut for animation state, and activeVote for current vote intent. Vote thresholds are 110 pixels horizontally for for/against votes and 120 pixels upward for abstain. Edge detection triggers at 32% of screen width or 24% of screen height.

### ProposalCard.tsx
This is a presentational component with no side effects. It handles image loading errors with fallbacks and displays mock creator coin metrics. It shows a cover image with fallback, displays creator avatar and username, shows mock metrics for market cap, volume, and 24h change, and is clickable to open the detail modal.

### CreatorFeedModal.tsx
This component handles async data fetching from the Zora API, manages loading states, and handles empty states. When it mounts with a proposal prop, a useEffect triggers loadCreatorTokens which calls getCreatorProfile with the creator address. It then displays tokens in a grid or shows an empty state. State includes tokens array from Zora and loading state for the API call.

### LandingPage.tsx
This component serves as the authentication gate UI. It displays a test mode toggle and wallet connection prompt. It features a gradient background, feature highlights, and a wallet connection button.

### WalletConnect.tsx
This component handles wallet connection UI, displays the connected address, and handles connect/disconnect actions. It uses Wagmi hooks: useAccount for wallet address and connection status, useConnect for connecting, and useDisconnect for disconnecting.

## Component Communication Patterns

Data flows down via props in simple parent-child relationships. For example, App passes proposals and onVote to SwipeStack, which passes proposal and onDetailClick to ProposalCard.

Global state uses React Context for the test mode toggle, which is needed across App, LandingPage, and SwipeStack components.

Callback props allow child-to-parent communication. SwipeStack receives onVote for vote submission and onDetailClick for opening the modal, which it calls to notify the parent.

## Component Patterns

Presentational components like ProposalCard and WalletConnect only render UI with no business logic. They are easy to test, reusable, and have clear separation of concerns.

Container components like App, SwipeStack, and CreatorFeedModal manage state and data fetching. They encapsulate complex logic and keep presentational components simple.

## Gesture Handling

SwipeStack uses Pointer Events API for cross-platform gesture support. It captures pointer events on drag start, tracks movement, and releases on drag end. This works with mouse, touch, and stylus uniformly, provides precise pointer capture that prevents event bubbling, and uses a unified API for all input types. The component also handles legacy events: onMouseDown for desktop mouse support and onTouchStart for mobile touch support.

## Related Documentation

- [Architecture Overview](./overview.md) - System architecture
- [Data Flow](./data-flow.md) - Component data flow
- [State Management](./state-management.md) - State patterns
