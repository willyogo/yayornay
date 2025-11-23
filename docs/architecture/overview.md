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
- Supabase Edge Functions provide serverless functions for server wallet management (Deno runtime)
- Builder DAO Subgraph provides GraphQL API for auction and proposal data (subgraph-first approach)
- Zora ZDK provides a GraphQL API client for fetching creator data
- Coinbase Developer Platform (CDP) provides:
  - RPC endpoint for Base blockchain
  - Server wallet management via CdpClient SDK
  - Account creation and transaction signing

### Styling
- Tailwind CSS 3.4.1 provides utility-first styling
- PostCSS processes CSS
- Custom CSS keyframe animations handle swipe interactions

## Layered Architecture

The application follows a layered architecture pattern with four distinct layers.

### Layer 1: Presentation Layer
Located in `src/components/`, this layer handles UI rendering, user interactions, and visual feedback. Components include App (root routing), LandingPage (authentication gate), SwipeStack (core swipe interaction), ProposalCard (individual card rendering), CreatorFeedModal (detail view), WalletConnect (wallet connection UI), and ServerWalletDisplay (server wallet management UI). These components are primarily presentational with minimal business logic.

### Layer 2: Business Logic Layer
Located in `src/hooks/`, this layer handles data fetching, mutations, and business rules. The `useProposals` hook fetches proposals from Supabase or returns mock data when test mode is enabled. The `useVoting` hook handles vote submission to the database. The `useServerWallet` hook manages CDP server wallet lifecycle (creation, retrieval, caching). These custom hooks encapsulate data fetching logic.

### Layer 3: Data Access Layer
Located in `src/lib/`, this layer provides external service clients and API abstractions. The Supabase client is a singleton instance. Wagmi configuration sets up the blockchain connection. Zora ZDK provides a GraphQL client for creator data. These clients use singleton patterns and typed interfaces.

### Layer 4: Infrastructure Layer
This layer consists of external services: Supabase PostgreSQL database, Base blockchain accessed via Coinbase RPC, and Zora GraphQL API. The application communicates with these services over HTTP/REST, JSON-RPC, and GraphQL respectively.

## Architectural Decisions

The application uses custom hooks with useState and useEffect for data fetching instead of React Query, even though React Query is configured. This means proposals refetch on every component mount with no caching or background updates.

SwipeStack uses the Pointer Capture API for gesture control, which provides precise control and prevents event bubbling issues. This works uniformly with mouse, touch, and stylus input.

Test mode is managed through React Context because it's needed across multiple components: App controls it, LandingPage displays the toggle, and SwipeStack uses it to skip actual vote submission.

The application uses a **subgraph-first approach** for data fetching. For auctions and proposals, the app queries Builder DAO subgraphs first (faster, includes historical data), then falls back to contract reads or Supabase queries if subgraph is unavailable. This provides faster reads, reduces on-chain query load, and enables historical data access.

The application uses Supabase as an intermediary database for proposals and votes rather than querying the blockchain directly. This provides faster reads through indexed queries, enables vote history tracking, stores proposal metadata, and uses Row Level Security for access control. The trade-off is that data must be synced between the blockchain and database.

The application uses **Coinbase Developer Platform (CDP) server wallets** to enable gasless transactions and simplified wallet management. Server wallets are created and managed via Supabase Edge Functions using the CDP SDK. Accounts are managed server-side by CDP, eliminating the need for local key storage or encryption. This architecture allows the app to pay gas fees on behalf of users and simplifies the onboarding experience.

## Configuration Management

All application-wide constants are centralized in `src/config/constants.ts`:

### Chain Configuration
```typescript
export const CHAIN_CONFIG = {
  ID: 84532, // Base Sepolia testnet
  NAME: 'base-sepolia',
  DISPLAY_NAME: 'Base Sepolia',
  RPC_URL: 'https://sepolia.base.org',
  BLOCK_EXPLORER_URL: 'https://sepolia.basescan.org',
} as const;
```

### Contract Addresses
```typescript
export const CONTRACTS = {
  NFT: '0x626FbB71Ca4FE65F94e73AB842148505ae1a0B26',
  AUCTION_HOUSE: '0xe9609Fb710bDC6f88Aa5992014a156aeb31A6896',
  GOVERNOR: '0x9F530c7bCdb859bB1DcA3cD4EAE644f973A5f505',
  TREASURY: '0x3ed26c1d23Fd4Ea3B5e2077B60B4F1EC80Aba94f',
  METADATA: '0x82ACd8e6ea567d99B63fcFc21ec824b5D05C9744',
} as const;
```

### DAO Address
```typescript
export const DAO_ADDRESS = '0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17' as const;
```

**Benefits of Centralized Constants:**
- Single source of truth for all configuration
- Easy to update contract addresses or chain settings
- Type-safe constants with `as const`
- Exported as `CONSTANTS` object for convenience
- Used throughout the application (Wagmi config, hooks, components)

**Contract ABIs** are defined in `src/config/contracts.ts`, which re-exports `CONTRACTS` from constants for backward compatibility.

## File Structure

The source code is organized into:
- `main.tsx` - Entry point with providers (WagmiProvider, QueryClientProvider, OnchainKitProvider)
- `App.tsx` - Root component managing view routing
- `components/` - Presentation layer (UI components)
- `hooks/` - Business logic layer (data fetching, state management)
- `lib/` - Data access layer (Supabase client, Wagmi config, API clients)
- `config/` - Configuration constants (contracts, chain config)
- `supabase/functions/` - Edge Functions for server wallet management
  - `create-wallet/` - Creates CDP server wallets
  - `get-wallet/` - Retrieves server wallet addresses
  - `send-transaction/` - Sends transactions via CDP SDK

## Related Documentation

- [Component Architecture](./components.md) - Detailed component structure
- [Data Flow](./data-flow.md) - How data moves through the system
- [State Management](./state-management.md) - State management patterns
- [Server Wallets](./server-wallets.md) - CDP server wallet architecture and implementation
