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

## Chain Configuration

The application is configured to use Base Sepolia testnet. The chain ID is 84532, and the RPC endpoint uses the public Base Sepolia RPC or can be configured via environment variable.

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

## Related Documentation

- [Wagmi Documentation](https://wagmi.sh) - Official Wagmi docs
- [Viem Documentation](https://viem.sh) - Viem library docs
- [Architecture Overview](../architecture/overview.md) - System architecture
