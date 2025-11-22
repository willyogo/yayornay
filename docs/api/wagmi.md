# Wagmi API Reference

## Configuration

Wagmi is configured in `src/lib/wagmi.ts` using the createConfig function. The configuration specifies Base Sepolia testnet (Chain ID 84532) as the only chain, uses Coinbase Wallet connector with smartWalletOnly preference, and connects to Base Sepolia via the public RPC endpoint (configurable via environment variable).

## Provider Setup

The WagmiProvider wraps the application in `src/main.tsx`, providing blockchain context to all components. The provider uses the config exported from the wagmi library file.

## Hooks

### useAccount

This hook provides connected account information. It returns the wallet address (or undefined if not connected), connection status as a boolean, and the current chain ID. The App component uses isConnected to conditionally render LandingPage or SwipeStack.

### useConnect

This hook handles wallet connection. It provides a connect function that takes a connector, a list of available connectors, pending state, and error state. The WalletConnect component uses this to connect the first available connector when the user clicks the connect button.

### useDisconnect

This hook handles wallet disconnection. It provides a disconnect function that the WalletConnect component calls when the user wants to disconnect.

### useReadContract

This hook reads data from smart contracts. It provides reactive contract reads that automatically refetch when dependencies change.

**Usage in `useAuction` hook:**
```typescript
const { data: auctionData, isLoading, error, refetch } = useReadContract({
  address: CONTRACTS.AUCTION_HOUSE,
  abi: AUCTION_HOUSE_ABI,
  functionName: 'auction',
  query: {
    refetchInterval: 15000, // Refetch every 15 seconds
  },
});
```

**Common Contract Reads:**
- `auction()` - Current auction state (nounId, amount, startTime, endTime, bidder, settled)
- `reservePrice()` - Minimum bid amount
- `minBidIncrementPercentage()` - Minimum percentage increase for new bids
- `duration()` - Auction duration in seconds
- `getSettlements(startId, endId, skipEmptyValues)` - Historical auction settlement data

**Returns:**
- `data` - The contract function return value (typed based on ABI)
- `isLoading` - Boolean indicating if the read is in progress
- `error` - Error object if the read failed
- `refetch` - Function to manually refetch the data

**Contract Addresses:**
All contract addresses are centralized in `src/config/constants.ts`:
- `CONTRACTS.AUCTION_HOUSE` - Auction house contract
- `CONTRACTS.NFT` - NFT contract
- `CONTRACTS.GOVERNOR` - Governor contract
- `CONTRACTS.TREASURY` - Treasury contract
- `CONTRACTS.METADATA` - Metadata contract

### useWriteContract

This hook writes data to smart contracts (sends transactions). It provides functions for submitting transactions and tracking their status.

**Usage in `AuctionPage` for bidding:**
```typescript
const { writeContractAsync } = useWriteContract();

// Place a bid
const hash = await writeContractAsync({
  address: CONTRACTS.AUCTION_HOUSE,
  abi: AUCTION_HOUSE_ABI,
  functionName: 'createBid',
  args: [auction.nounId],
  value: valueWei, // Bid amount in wei
});
```

**Usage in `AuctionPage` for settlement:**
```typescript
// Settle auction
const hash = await writeContractAsync({
  address: CONTRACTS.AUCTION_HOUSE,
  abi: AUCTION_HOUSE_ABI,
  functionName: 'settleAuction', // or 'settleCurrentAndCreateNewAuction'
  args: [],
});
```

**Transaction Simulation:**
Before submitting transactions, the app uses `simulateContract` from `wagmi/actions` to validate the transaction:

```typescript
import { simulateContract } from 'wagmi/actions';

// Simulate first
const simulation = await simulateContract(config, {
  address: CONTRACTS.AUCTION_HOUSE,
  abi: AUCTION_HOUSE_ABI,
  functionName: 'createBid',
  args: [auction.nounId],
  value: valueWei,
  account: address!,
});

// Then submit
const hash = await writeContractAsync(simulation.request);
```

**Transaction Receipt:**
After submitting, wait for transaction receipt:

```typescript
import { waitForTransactionReceipt } from 'wagmi/actions';

const receipt = await waitForTransactionReceipt(config, {
  hash,
  timeout: 60_000,
});

if (receipt.status === 'success') {
  // Transaction succeeded
}
```

**Returns:**
- `writeContract` - Function to write contract (returns hash immediately)
- `writeContractAsync` - Async function that returns transaction hash
- `isPending` - Boolean indicating if transaction is pending
- `isSuccess` - Boolean indicating if transaction succeeded
- `isError` - Boolean indicating if transaction failed
- `error` - Error object if transaction failed
- `data` - Transaction hash if successful

## Chain Configuration

The application is configured to use Base Sepolia testnet. Chain configuration is centralized in `src/config/constants.ts`:

```typescript
export const CHAIN_CONFIG = {
  ID: 84532, // Base Sepolia testnet
  NAME: 'base-sepolia',
  DISPLAY_NAME: 'Base Sepolia',
  RPC_URL: 'https://sepolia.base.org',
  BLOCK_EXPLORER_URL: 'https://sepolia.basescan.org',
} as const;
```

The RPC endpoint can be overridden via `VITE_BASE_SEPOLIA_RPC_URL` environment variable, but defaults to `CHAIN_CONFIG.RPC_URL`.

## Connector Configuration

Coinbase Wallet connector is configured with the app name "YAYNAY" and preference set to smartWalletOnly, meaning only smart wallets are allowed, not externally owned accounts.

## Current Usage

The WalletConnect component uses useAccount to check connection status and get the address, useConnect to connect wallets, and useDisconnect to disconnect. When connected, it displays a shortened version of the address. When not connected, it shows a connect button.

Addresses are normalized to lowercase before storing in the database. The useVoting hook lowercases the address from Wagmi before inserting votes.

## State Management

Wagmi manages blockchain state internally. Connection state is persisted in localStorage, so wallet connections survive page reloads. Account state is reactive and updates when the wallet changes. Chain state tracks the current chain the wallet is connected to.

## Error Handling

Connection errors are available through the error property returned by useConnect. Common errors include user rejection when the user declines the connection prompt, no provider when the wallet extension isn't installed, and wrong chain when connected to a different chain than Base Sepolia.

## Current Implementation Details

The application checks wallet connection before allowing actions. The useVoting hook throws an error if no address is available. Addresses are always lowercased for consistency when storing in the database. There is no chain switching logic currently - the app assumes users are on Base Sepolia testnet.

### Contract Interaction Patterns

**Reading Contract Data:**
- `useAuction` hook uses `useReadContract` to read auction state
- Multiple contract reads are combined to get complete auction information
- Subgraph is preferred, but contract reads serve as fallback

**Writing Contract Data:**
- `AuctionPage` uses `useWriteContract` for bidding and settlement
- Transactions are simulated before submission to catch errors early
- Transaction receipts are awaited to confirm success
- Transaction hashes are displayed with block explorer links

**Error Handling:**
- Contract read errors are caught and logged
- Write errors are displayed to users via error messages
- Failed transactions show error details
- Simulation failures trigger fallback to direct write

## Related Documentation

- [Wagmi Documentation](https://wagmi.sh) - Official Wagmi docs
- [Viem Documentation](https://viem.sh) - Viem library docs
- [Architecture Overview](../architecture/overview.md) - System architecture
