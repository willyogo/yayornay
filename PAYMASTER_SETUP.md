# Coinbase Paymaster Integration

This app uses Coinbase Developer Platform (CDP) Paymaster to sponsor gas fees for users, making voting and bidding completely free.

## Features

- ✅ **Sponsored Voting**: Cast votes on proposals without paying gas
- ✅ **Sponsored Bidding**: Place bids on auctions without gas fees
- ✅ **Sponsored Settlement**: Settle auctions for free
- ✅ **Smart Wallet Only**: Automatic gas sponsorship for Coinbase Smart Wallet users

## Setup Instructions

### 1. Get Your CDP API Key

1. Create account at [Coinbase Developer Platform](https://coinbase.com/developer-platform)
2. Navigate to your project dashboard
3. Copy your API Key from the OnchainKit section
4. Add to `.env.local`:
   ```env
   VITE_CDP_API_KEY=your-api-key-here
   ```

### 2. Configure Paymaster

1. Go to [CDP Paymaster](https://portal.cdp.coinbase.com/products/bundler-and-paymaster)
2. Switch to **Base Sepolia** (testnet) or **Base** (mainnet) in top right
3. Under **Configuration**, add your contract addresses to the allowlist:
   - **Governor Contract**: `0x...` (for voting)
   - **Auction House Contract**: `0x...` (for bidding and settling)
4. Copy your Paymaster & Bundler endpoint URL
5. Add to `.env.local`:
   ```env
   VITE_PAYMASTER_URL=your-paymaster-endpoint-here
   ```

### 3. Update Contract Addresses

Edit `/src/config/contracts.ts` to match your deployed contracts:

```typescript
export const CONTRACTS = {
  GOVERNOR: '0x...', // Your Governor contract
  AUCTION_HOUSE: '0x...', // Your AuctionHouse contract
  // ...
};
```

### 4. Test Sponsored Transactions

1. Connect with Coinbase Smart Wallet (not MetaMask/other EOAs)
2. Try voting on a proposal - no gas prompt!
3. Try placing a bid - free transaction!

## How It Works

### Architecture

```
User Action → useSponsoredTransaction Hook → Wagmi + OnchainKit → Paymaster API → Bundler → Blockchain
```

### Key Components

1. **`OnchainKitProvider`** (`src/main.tsx`)
   - Wraps app with CDP configuration
   - Provides paymaster URL to all transactions

2. **`useSponsoredTransaction`** (`src/hooks/useSponsoredTransaction.ts`)
   - Generic hook for sponsored contract calls
   - Automatic error handling and transaction tracking

3. **`useVoting`** (`src/hooks/useVoting.ts`)
   - Uses `useSponsoredTransaction` for voting
   - Zero gas cost for users

4. **Bidding in `AuctionPage`** (`src/components/AuctionPage.tsx`)
   - Uses `useSponsoredTransaction` for bids
   - Free auction participation

### Smart Wallet Requirement

**Important**: Gas sponsorship only works with Coinbase Smart Wallets (ERC-4337 account abstraction). Regular wallets (EOAs) like MetaMask will pay gas normally.

Your app is configured with:
```typescript
coinbaseWallet({
  appName: 'YAYNAY',
  preference: 'smartWalletOnly', // Forces Smart Wallet
})
```

## Gas Policy Configuration

### Allowlist Strategy

The Paymaster allowlist prevents abuse by only sponsoring transactions to specific contracts:

- ✅ **Governor**: Allows voting transactions
- ✅ **Auction House**: Allows bidding and settling
- ❌ **Other contracts**: Will not be sponsored

### Rate Limits

- **Free Tier**: Limited gas credits per month
- **Scaling**: [Apply for more credits](https://docs.google.com/forms/d/1yPnBFW0bVUNLUN_w3ctCqYM9sjdIQO3Typ53KXlsS5g/viewform) as your app grows

## Monitoring

View transaction analytics in the [CDP Dashboard](https://portal.cdp.coinbase.com/):
- Total sponsored gas
- Transaction success rate
- Gas credit remaining
- User activity metrics

## Troubleshooting

### "Transaction failed" errors

1. **Check allowlist**: Ensure your contracts are in the Paymaster allowlist
2. **Verify network**: Paymaster must be configured for the same network (Base Sepolia vs Base mainnet)
3. **Smart Wallet**: User must be using Coinbase Smart Wallet

### Paymaster not working

1. Check console logs for `[Paymaster]` messages
2. Verify `VITE_PAYMASTER_URL` is set correctly
3. Ensure CDP API key is valid
4. Check [CDP Status](https://cdpstatus.coinbase.com/)

### Logs to check

```javascript
// Sponsored transaction execution
[Paymaster] Executing sponsored transaction: {...}
[Paymaster] Transaction submitted: 0x...
[Paymaster] Transaction confirmed: 0x...

// Voting
[Voting] Submitting sponsored vote: {...}

// Bidding  
[Auction] Placing sponsored bid: {...}
```

## Resources

- [CDP Documentation](https://docs.cdp.coinbase.com/)
- [Paymaster Guide](https://docs.cdp.coinbase.com/paymaster/introduction/welcome)
- [OnchainKit Docs](https://onchainkit.xyz/)
- [Smart Wallet Guide](https://smartwallet.dev/)
- [CDP Discord](https://discord.com/invite/cdp)

## Next Steps

- [ ] Set up Paymaster endpoint URL in `.env.local`
- [ ] Add contract addresses to allowlist
- [ ] Test sponsored voting
- [ ] Test sponsored bidding
- [ ] Monitor gas usage in dashboard
- [ ] Apply for additional credits when ready to scale
