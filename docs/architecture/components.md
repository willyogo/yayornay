# Component Architecture

## Component Hierarchy

The application renders a strict mode wrapper containing WagmiProvider for blockchain context and QueryClientProvider for React Query. Inside these providers, the App component manages view routing with three main views: `landing`, `auction`, and `submit`. The App component conditionally renders:

- **LandingPage** (when wallet is not connected) - Contains WalletConnect
- **AuctionPage** (when view is 'auction') - Displays auction information and bidding interface
- **SwipeStack** (when view is 'landing' and wallet connected) - Displays ProposalCard components in a stack with action buttons
- **SubmitPage** (when view is 'submit') - Form for submitting new proposals
- **CreatorFeedModal** - Renders conditionally when a proposal is selected
- **AppHeader** - Navigation header present on all views

## Component Responsibilities

### App.tsx
The root component handles view routing using the `AppView` type ('landing' | 'auction' | 'submit'). It coordinates global state, composes providers, and initializes the Farcaster SDK. It manages three main views:
- **landing**: Shows LandingPage when wallet not connected, or SwipeStack when connected
- **auction**: Shows AuctionPage for auction viewing and bidding
- **submit**: Shows SubmitPage for proposal submission

It manages test mode through Context (now controlled by URL query parameter), tracks the selected proposal for modal display, and preserves the previous view when connecting wallet to return users to their intended destination.

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

### AuctionPage.tsx
This is the main auction interface component. It manages auction state, handles bidding, settlement, and navigation between current and past auctions. Key responsibilities include:
- Fetching current auction data via `useAuction` hook
- Managing `viewNounId` state for navigating between auctions
- Fetching past auction data from subgraph or contract settlements
- Handling bid submission via `BidModal`
- Handling auction settlement with different button text for winners vs others
- Displaying transaction status and error messages
- Coordinating with `AuctionHero` for visual display

State includes: `bidModalOpen`, `bidSubmitting`, `isSettling`, `viewNounId`, `displayAuction`, `displayCountdown`, `actionMessage`, `actionError`, `txHash`.

### AuctionHero.tsx
This component displays a single auction visually. It shows the Noun NFT image, current bid amount, highest bidder address, time remaining, and action buttons. Key features:
- Displays NFT image via `NounImage` component
- Shows auction status badge (live, pending, ended)
- Navigation arrows for previous/next auctions
- Connect wallet button when not connected
- Bid input and button when connected and auction is active
- Settlement button when auction has ended (shows "Claim NFT" for winners, "Start Next Auction" for others)
- Responsive card layout with unified mobile/desktop styling

Props include: `auction`, `countdownMs`, `onOpenBid`, `onSettle`, `isSettling`, `isConnected`, `onConnectWallet`, `dateLabel`, `minRequiredWei`, `onPlaceBid`, `isCurrentView`, `onPrev`, `onNext`, `canGoNext`, `canGoPrev`, `currentWalletAddress`.

### NounImage.tsx
This component fetches and displays Noun NFT images. It:
- Reads `tokenURI` from the NFT contract (using `CONTRACTS.NFT`)
- Parses the metadata to extract image URL
- Falls back to `noun.pics` if contract read fails
- Handles loading and error states
- Supports priority loading for above-the-fold images

### BidModal.tsx
This modal component handles bid input and submission. It:
- Displays current bid amount and minimum required bid
- Validates bid amount against minimum increment
- Shows error messages for invalid bids
- Handles bid submission via callback prop
- Manages loading state during transaction submission

### AppHeader.tsx
This component provides navigation between views. It:
- Displays the current view
- Provides buttons to switch between landing, auction, and submit views
- Uses `ViewToggle` component for view switching
- Maintains consistent header styling across views

### SubmitPage.tsx
This component provides a form for submitting new proposals. It handles proposal creation workflow (implementation details may vary).

### ViewToggle.tsx
This component provides a toggle interface for switching between views. It displays buttons for each available view and calls `onChange` when a view is selected.

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
