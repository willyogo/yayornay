# Authentication System

## Overview

The application uses **wallet-based authentication** via Wagmi. There is no traditional username/password system. Instead, users authenticate by connecting their crypto wallet, which provides their Ethereum address as their identity.

## Authentication Flow

### 1. Initial State (Not Connected)

When a user first visits the app or disconnects their wallet:

- **App Component** (`src/App.tsx`) checks `isConnected` from `useAccount()` hook
- If `!isConnected`, the app renders one of three views:
  - **Landing Page** (default) - Shows "Swipe to Govern" with wallet connection prompt
  - **Auction Page** - Accessible via "Become a Voter" button (view-only, no bidding)
  - **Submit Page** - Accessible via navigation (view-only)

### 2. Wallet Connection

Users connect their wallet through the `WalletConnect` component:

**Connection Process:**
1. User clicks "Login" button on `LandingPage`
2. `WalletConnect` component calls `connect({ connector: connectors[0] })`
3. Wagmi triggers Coinbase Wallet connection flow
4. User approves connection in their wallet
5. Wagmi updates `isConnected` state to `true`
6. Wallet address is available via `address` from `useAccount()`

**Wallet Configuration:**
- **Connector**: Coinbase Wallet only
- **Preference**: `smartWalletOnly` - Only smart wallets allowed (no externally owned accounts)
- **Chain**: Base Sepolia testnet (Chain ID 84532)
- **Persistence**: Connection state saved in `localStorage` by Wagmi

### 3. Post-Connection Behavior

When a wallet connects, the app:

1. **Tracks Previous View**: 
   - `previousViewRef` stores the view the user was on before connecting
   - Allows users to return to their intended destination after login

2. **View Restoration**:
   - If user was on `auction` page → Returns to auction page
   - If user was on `submit` page → Returns to submit page  
   - Otherwise → Goes to `landing` page (shows voting interface)

3. **Access Granted**:
   - Full access to voting interface (`SwipeStack`)
   - Can place bids on auctions
   - Can settle auctions (if winner)
   - Can submit proposals

### 4. Disconnection

When a user disconnects:

1. User clicks disconnect button in `WalletConnect` component
2. `disconnect()` function called from `useDisconnect()` hook
3. Wagmi clears connection state
4. App returns to unauthenticated state
5. User can still view auction/submit pages but cannot interact

## Authentication Components

### WalletConnect Component

**Location**: `src/components/WalletConnect.tsx`

**Responsibilities**:
- Display connection status
- Show connect/disconnect buttons
- Display shortened wallet address when connected

**Hooks Used**:
- `useAccount()` - Get connection status and address
- `useConnect()` - Connect wallet
- `useDisconnect()` - Disconnect wallet

**UI States**:
- **Not Connected**: Shows "Login" button with wallet icon
- **Connected**: Shows shortened address with green indicator and disconnect button

### App Component

**Location**: `src/App.tsx`

**Authentication Logic**:
```typescript
const { isConnected, address } = useAccount();

// Conditional rendering based on connection status
if (!isConnected) {
  // Show landing/auction/submit pages (limited access)
} else {
  // Show full app with voting interface
}
```

**View Management**:
- Tracks `previousViewRef` to restore user's intended destination
- Manages `view` state (`'landing' | 'auction' | 'submit'`)
- Handles view restoration when wallet connects

## Authentication Checks

### Feature-Level Checks

The app performs authentication checks at the feature level:

**Voting** (`useVoting` hook):
```typescript
if (!address) {
  throw new Error('Wallet not connected');
}
```

**Bidding** (`AuctionPage`):
```typescript
const canBid = isConnected && isAuctionActive && !settled && auction !== undefined;
```

**Settlement** (`AuctionPage`):
```typescript
if (!isConnected) {
  setActionError('Connect a wallet to settle the auction.');
  return;
}
```

### No NFT Ownership Verification

**Important**: The app does **not** currently verify that users own NFTs before allowing actions:

- **Voting**: Anyone with a connected wallet can vote (voting power hardcoded to 1)
- **Bidding**: Anyone with a connected wallet can bid on auctions
- **Settlement**: Anyone with a connected wallet can settle auctions

**Available but Unused**:
- `useNounBalance` hook exists (`src/hooks/useNounBalance.ts`) to check NFT balance
- Currently not used to gate access to features
- Could be used in the future to verify voting power

## State Management

### Wagmi State

Wagmi manages authentication state internally:

- **Connection State**: Persisted in `localStorage`
- **Account State**: Reactive, updates when wallet changes
- **Chain State**: Tracks current chain (Base Sepolia)

### App State

The app manages view state related to authentication:

- **`isConnected`**: From Wagmi, determines if user is authenticated
- **`address`**: From Wagmi, user's wallet address
- **`previousViewRef`**: Tracks view before connection
- **`wasConnectedRef`**: Tracks connection state transitions

## Configuration

### Wagmi Config

**Location**: `src/lib/wagmi.ts`

```typescript
export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'YAYNAY',
      preference: 'smartWalletOnly', // Only smart wallets
    }),
  ],
  transports: {
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
});
```

### Provider Setup

**Location**: `src/main.tsx`

```typescript
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</WagmiProvider>
```

## Security Considerations

### Current Limitations

1. **No NFT Ownership Verification**: Users can vote/bid without owning NFTs
2. **No Voting Power Calculation**: Voting power is hardcoded to 1
3. **No Rate Limiting**: No protection against spam votes/bids
4. **No Session Management**: Relies entirely on Wagmi's localStorage persistence

### Potential Improvements

1. **NFT Balance Checks**: Use `useNounBalance` to verify ownership before voting
2. **Voting Power**: Calculate actual voting power from NFT balance
3. **Transaction Verification**: Verify votes/bids are actually submitted on-chain
4. **Session Timeout**: Add session expiration logic

## User Experience Flow

### First-Time User

1. Lands on **Landing Page**
2. Sees "Swipe to Govern" and "Login" button
3. Clicks "Login" → Wallet connection prompt
4. Approves connection → Redirected to voting interface
5. Can now vote on proposals

### Returning User

1. Wagmi automatically restores connection from `localStorage`
2. User immediately sees voting interface (if previously connected)
3. No need to reconnect unless they manually disconnect

### Viewing Auction Without Wallet

1. User clicks "Become a Voter" on landing page
2. Navigates to **Auction Page** (view-only)
3. Can see auction details but cannot bid
4. Sees "Connect Wallet to Bid" button
5. After connecting, can place bids

## Related Documentation

- [Wagmi API Reference](../api/wagmi.md) - Wagmi hooks and configuration
- [Component Architecture](./components.md) - Component details
- [State Management](./state-management.md) - State management patterns

