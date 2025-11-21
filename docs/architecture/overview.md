# Architecture Overview

## System Architecture

The application is a React-based client that connects to three external services: Supabase for database storage, Base blockchain for wallet connections, and Zora API for creator data.

The client application uses React for UI rendering, Wagmi for blockchain interactions, and React Query is configured but not actively used for data caching.

## Technology Stack

### Frontend Framework
- React 19.2.0 provides the UI layer with concurrent features
- TypeScript 5.5.3 enforces type safety in strict mode
- Vite 5.4.21 handles bundling and provides hot module replacement during development

### State & Data Management
- React Query is configured in the app but not used for data fetching
- React Context API manages the global test mode toggle
- Local useState hooks handle component-level state

### Blockchain Integration
- Wagmi v2 provides React hooks for Ethereum interactions
- Viem v2 is the underlying TypeScript Ethereum library
- Coinbase Wallet connector is configured to only allow smart wallets

### Backend Services
- Supabase hosts a PostgreSQL database with Row Level Security enabled
- Zora ZDK provides a GraphQL API client for fetching creator data
- Coinbase Developer Platform provides the RPC endpoint for Base blockchain

### Styling
- Tailwind CSS 3.4.1 provides utility-first styling
- PostCSS processes CSS
- Custom CSS keyframe animations handle swipe interactions

## Layered Architecture

The application follows a layered architecture pattern with four distinct layers.

### Layer 1: Presentation Layer
Located in `src/components/`, this layer handles UI rendering, user interactions, and visual feedback. Components include App (root routing), LandingPage (authentication gate), SwipeStack (core swipe interaction), ProposalCard (individual card rendering), CreatorFeedModal (detail view), and WalletConnect (wallet connection UI). These components are primarily presentational with minimal business logic.

### Layer 2: Business Logic Layer
Located in `src/hooks/`, this layer handles data fetching, mutations, and business rules. The `useProposals` hook fetches proposals from Supabase or returns mock data when test mode is enabled. The `useVoting` hook handles vote submission to the database. These custom hooks encapsulate data fetching logic.

### Layer 3: Data Access Layer
Located in `src/lib/`, this layer provides external service clients and API abstractions. The Supabase client is a singleton instance. Wagmi configuration sets up the blockchain connection. Zora ZDK provides a GraphQL client for creator data. These clients use singleton patterns and typed interfaces.

### Layer 4: Infrastructure Layer
This layer consists of external services: Supabase PostgreSQL database, Base blockchain accessed via Coinbase RPC, and Zora GraphQL API. The application communicates with these services over HTTP/REST, JSON-RPC, and GraphQL respectively.

## Architectural Decisions

The application uses custom hooks with useState and useEffect for data fetching instead of React Query, even though React Query is configured. This means proposals refetch on every component mount with no caching or background updates.

SwipeStack uses the Pointer Capture API for gesture control, which provides precise control and prevents event bubbling issues. This works uniformly with mouse, touch, and stylus input.

Test mode is managed through React Context because it's needed across multiple components: App controls it, LandingPage displays the toggle, and SwipeStack uses it to skip actual vote submission.

The application uses Supabase as an intermediary database rather than querying the blockchain directly. This provides faster reads through indexed queries, enables vote history tracking, stores proposal metadata, and uses Row Level Security for access control. The trade-off is that data must be synced between the blockchain and database.

## File Structure

The source code is organized into: `main.tsx` as the entry point with providers, `App.tsx` as the root component, `components/` for the presentation layer, `hooks/` for business logic, `lib/` for data access, and `config/` for configuration constants.

## Related Documentation

- [Component Architecture](./components.md) - Detailed component structure
- [Data Flow](./data-flow.md) - How data moves through the system
- [State Management](./state-management.md) - State management patterns
