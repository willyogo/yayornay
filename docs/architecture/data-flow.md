# Data Flow

## Proposal Loading Flow

When the App component mounts, it calls the useProposals hook with the test mode flag. The hook's useEffect triggers fetchProposals. If test mode is enabled, it immediately returns mock proposals. Otherwise, it queries Supabase for proposals matching the configured DAO address with active status, ordered by creation date descending. The proposals are stored in state and passed to SwipeStack as props. SwipeStack renders a ProposalCard for the proposal at the current index.

## Voting Flow

When a user swipes a card or clicks a vote button, SwipeStack calls handleVote with the vote type. The animation starts by setting isAnimatingOut to true. It then calls the onVote callback with the proposal ID and vote type. The useVoting hook's submitVote function checks that a wallet is connected, then inserts a vote record into Supabase with the proposal ID, voter address from Wagmi (lowercased), vote type, hardcoded voting power of 1, and a mock transaction hash generated from the current timestamp. After handling any errors, there's a 400ms delay before moving to the next card and resetting the card position.

Currently, votes do not create actual blockchain transactions. The transaction hash is a mock value. Voting power is hardcoded to 1 and not calculated from NFT holdings. Duplicate vote prevention relies on the database unique constraint on proposal_id and voter_address.

## Creator Feed Flow

When a user clicks a ProposalCard, App sets the selected proposal in state. This causes CreatorFeedModal to mount with the proposal prop. A useEffect triggers loadCreatorTokens which calls getCreatorProfile with the creator address. This makes a GraphQL query to Zora API for tokens owned by that address, transforms the response into CreatorToken objects, and stores them in state. The component then renders a grid of tokens or an empty state if none are found.

## State Update Flow

User actions trigger component event handlers, which call custom hooks like useVoting or useProposals. These hooks either update local useState or make calls to external services like Supabase or Zora. State updates trigger React re-renders, which update the UI.

## Data Sources

Supabase serves as the primary database, storing proposals and votes. Proposals are queried on component mount with no caching, so they refetch every time. Votes are inserted when users submit votes.

Wagmi manages blockchain state including wallet connection status, connected address, and chain information. This state updates in real-time as managed internally by Wagmi and persists wallet connections in localStorage.

Zora API provides creator profile and token data through GraphQL queries. Creator tokens are fetched when the modal opens, with no caching, so they refetch every time the modal is opened.

## Data Flow Patterns

The application uses unidirectional data flow where data flows down via props and events flow up via callbacks. Parent components pass data down to children, and children notify parents through callback functions.

Async data loading uses useEffect hooks that call async functions when dependencies change. These functions fetch data, update state, and handle errors.

Error handling uses try-catch blocks in async functions. Errors are caught, logged, and state is updated accordingly, with loading states managed in finally blocks.

## Related Documentation

- [Architecture Overview](./overview.md) - System architecture
- [Component Architecture](./components.md) - Component structure
- [State Management](./state-management.md) - State patterns
- [API Reference](../api/) - External API documentation
