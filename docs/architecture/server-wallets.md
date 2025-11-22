# CDP Server Wallets Integration Guide

## Overview

Coinbase Developer Platform (CDP) Server Wallets allow you to create and manage wallets on behalf of your users. Unlike traditional wallet connections where users bring their own wallets, server wallets are created and managed by your application, enabling features like:

- **Gasless transactions** - Your app can pay for user transactions
- **Simplified onboarding** - Users don't need to install wallet extensions
- **Batch operations** - Execute multiple transactions efficiently
- **Enhanced security** - MPC (Multi-Party Computation) key management

## Architecture Overview

### Current State (User Wallets)
```
User → Coinbase Wallet Extension → Wagmi → Your App
```
- Users connect their own wallets
- Users pay for their own gas
- Users must have wallet installed

### With Server Wallets
```
User → Your App → CDP SDK → Server Wallet (managed by CDP)
```
- App creates wallet for each user
- App can pay gas on behalf of users
- No wallet extension required
- Wallet keys managed securely by CDP

## Setup Process

### 1. Create CDP API Key

1. Go to [Coinbase Developer Platform](https://www.coinbase.com/developer-platform/products/wallets)
2. Create a new **Secret API Key**
3. Download the private key file (`.pem` format)
4. Note the API key name

**Important**: Store the private key securely (never commit to git). Use environment variables or a secrets manager.

### 2. Install CDP SDK

The SDK is already installed in this project (`@coinbase/cdp-sdk`), but you'll need to use the correct package:

```bash
npm install @coinbase/coinbase-sdk
# or
pnpm add @coinbase/coinbase-sdk
```

**Note**: The installed `@coinbase/cdp-sdk` package appears to be a different package. You may need to install `@coinbase/coinbase-sdk` instead.

### 3. Initialize CDP SDK

Create a new file `src/lib/cdp.ts`:

```typescript
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

// Get API credentials from environment variables
const apiKeyName = import.meta.env.VITE_CDP_API_KEY_NAME;
const apiKeyPrivateKey = import.meta.env.VITE_CDP_API_KEY_PRIVATE_KEY;

if (!apiKeyName || !apiKeyPrivateKey) {
  throw new Error('Missing CDP API credentials');
}

// Configure the SDK
Coinbase.configure({
  apiKeyName,
  privateKey: apiKeyPrivateKey,
});

export { Coinbase, Wallet };
```

### 4. Environment Variables

Add to your `.env` file:

```env
# CDP API Credentials
VITE_CDP_API_KEY_NAME=your-api-key-name
VITE_CDP_API_KEY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----

# Note: For production, use server-side environment variables instead
# These should NEVER be exposed in client-side code
```

**Security Warning**: API keys with private keys should **NEVER** be used in client-side code. For production, you'll need a backend API to handle wallet operations.

## Creating Server Wallets for Users

### Option 1: Create Wallet on User Registration

When a user first connects (or registers), create a server wallet for them:

```typescript
// src/lib/serverWallet.ts
import { Wallet } from './cdp';

export interface UserWallet {
  walletId: string;
  address: string;
  networkId: string;
}

/**
 * Create a new server wallet for a user
 * This should be called server-side or through a secure API endpoint
 */
export async function createUserWallet(): Promise<UserWallet> {
  // Create wallet (defaults to Base Sepolia testnet)
  const wallet = await Wallet.create({
    networkId: 'base-sepolia', // or 'base-mainnet' for production
  });

  // Get the default address
  const address = await wallet.getDefaultAddress();

  // Serialize wallet data for storage
  const walletData = wallet.serialize();

  return {
    walletId: wallet.getId(),
    address: address.address,
    networkId: 'base-sepolia',
    // Store walletData securely - you'll need this to restore the wallet
    walletData: walletData, // ⚠️ Store this securely in your database
  };
}
```

### Option 2: Database Schema Updates

You'll need to store wallet information for each user. Update your database schema:

```sql
-- Add server_wallets table
CREATE TABLE IF NOT EXISTS server_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL UNIQUE, -- The user's connected wallet address
  server_wallet_id text NOT NULL UNIQUE, -- CDP wallet ID
  server_wallet_address text NOT NULL, -- The server wallet's address
  wallet_data jsonb NOT NULL, -- Serialized wallet data (encrypted)
  network_id text DEFAULT 'base-sepolia',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_server_wallets_user_address ON server_wallets(user_address);
CREATE INDEX IF NOT EXISTS idx_server_wallets_server_wallet_id ON server_wallets(server_wallet_id);

-- Enable RLS
ALTER TABLE server_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own wallet info
CREATE POLICY "Users can read their own server wallet"
  ON server_wallets FOR SELECT
  TO authenticated, anon
  USING (user_address = current_setting('app.user_address', true));
```

### Option 3: Integration Flow

Here's how the flow would work in your app:

```typescript
// src/hooks/useServerWallet.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { Wallet } from '../lib/cdp';

export function useServerWallet() {
  const { address } = useAccount();
  const [serverWallet, setServerWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    async function getOrCreateServerWallet() {
      // Check if user already has a server wallet
      const { data: existing } = await supabase
        .from('server_wallets')
        .select('*')
        .eq('user_address', address.toLowerCase())
        .single();

      if (existing) {
        setServerWallet(existing.server_wallet_address);
        setLoading(false);
        return;
      }

      // Create new server wallet (this should be done server-side!)
      // For now, this is a placeholder - you'll need a backend API
      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address }),
      });

      if (response.ok) {
        const { serverWalletAddress } = await response.json();
        
        // Store in database
        await supabase.from('server_wallets').insert({
          user_address: address.toLowerCase(),
          server_wallet_address: serverWalletAddress,
        });

        setServerWallet(serverWalletAddress);
      }

      setLoading(false);
    }

    getOrCreateServerWallet();
  }, [address]);

  return { serverWallet, loading };
}
```

## Wallet Security Models

CDP offers two security models:

### 1. Developer-Managed (1-of-1) Wallets
- **Use Case**: Development, testing, low-value transactions
- **Security**: You manage the private keys
- **Setup**: Faster, simpler
- **Risk**: If your keys are compromised, wallets are compromised

```typescript
const wallet = await Wallet.create({
  networkId: 'base-sepolia',
  // Default is developer-managed
});
```

### 2. Coinbase-Managed (2-of-2) MPC Wallets
- **Use Case**: Production, high-value transactions
- **Security**: Keys split between you and Coinbase using MPC
- **Setup**: Requires additional configuration
- **Risk**: Even if your keys are compromised, Coinbase's key is still needed

```typescript
const wallet = await Wallet.create({
  networkId: 'base-sepolia',
  walletConfig: {
    type: 'COINBASE_MANAGED', // 2-of-2 MPC
  },
});
```

## Using Server Wallets

### Sending Transactions

```typescript
// Restore wallet from stored data
const walletData = await getWalletDataFromDatabase(userAddress);
const wallet = await Wallet.import(walletData);

// Send a transaction
const transfer = await wallet.send({
  to: recipientAddress,
  amount: '1000000000000000000', // 1 ETH in wei
  currency: 'ETH',
  networkId: 'base-sepolia',
});
```

### Checking Balances

```typescript
const balances = await wallet.getBalances();
console.log(balances); // Array of token balances
```

### Signing Messages

```typescript
const signature = await wallet.signMessage({
  message: 'Hello, World!',
});
```

## Backend API Requirements

**Critical**: CDP API keys with private keys must **NEVER** be exposed in client-side code. You'll need a backend API:

### Example Backend Endpoint (Node.js/Express)

```typescript
// backend/routes/wallets.ts
import express from 'express';
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

const router = express.Router();

// Initialize CDP SDK (server-side only)
Coinbase.configure({
  apiKeyName: process.env.CDP_API_KEY_NAME!,
  privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!,
});

// Create wallet for user
router.post('/create', async (req, res) => {
  const { userAddress } = req.body;

  try {
    // Create wallet
    const wallet = await Wallet.create({
      networkId: 'base-sepolia',
    });

    const address = await wallet.getDefaultAddress();
    const walletData = wallet.serialize();

    // Store in database (encrypt walletData!)
    await db.serverWallets.create({
      userAddress,
      walletId: wallet.getId(),
      walletAddress: address.address,
      walletData: encrypt(walletData), // Encrypt before storing!
    });

    res.json({
      serverWalletAddress: address.address,
      walletId: wallet.getId(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Send transaction on behalf of user
router.post('/send', async (req, res) => {
  const { userAddress, to, amount, currency } = req.body;

  try {
    // Get wallet from database
    const walletRecord = await db.serverWallets.findByUserAddress(userAddress);
    const walletData = decrypt(walletRecord.walletData);
    const wallet = await Wallet.import(walletData);

    // Send transaction
    const transfer = await wallet.send({
      to,
      amount,
      currency,
      networkId: 'base-sepolia',
    });

    res.json({ transactionHash: transfer.hash });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send transaction' });
  }
});

export default router;
```

## Integration with Your App

### Use Cases in YAYNAY

1. **Gasless Voting**: Users vote without paying gas
   ```typescript
   // User swipes to vote
   // Your backend uses their server wallet to submit vote transaction
   // You pay the gas fees
   ```

2. **Simplified Onboarding**: Users don't need wallet extensions
   ```typescript
   // User signs up with email/social
   // App creates server wallet automatically
   // User can interact immediately
   ```

3. **Batch Operations**: Execute multiple votes efficiently
   ```typescript
   // User swipes through multiple proposals
   // Batch all votes into single transaction
   // More efficient and cheaper
   ```

### Migration Path

1. **Phase 1**: Keep current wallet connection, add server wallet creation
2. **Phase 2**: Allow users to choose between their wallet or server wallet
3. **Phase 3**: Make server wallet default, keep user wallet as option

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Encrypt wallet data** before storing in database
3. **Use HTTPS** for all API communications
4. **Implement rate limiting** on wallet operations
5. **Monitor wallet activity** for suspicious transactions
6. **Use 2-of-2 MPC** for production wallets
7. **Implement IP whitelisting** in CDP portal
8. **Rotate API keys** regularly

## Cost Considerations

- **Wallet Creation**: Free
- **Transaction Fees**: You pay gas fees for user transactions
- **API Usage**: Check CDP pricing for API limits
- **Storage**: Wallet data storage costs

## Next Steps

1. Set up backend API for wallet operations
2. Update database schema to store server wallets
3. Implement wallet creation flow
4. Add transaction signing endpoints
5. Update frontend to use server wallets
6. Test with small amounts first
7. Monitor costs and usage

## Resources

- [CDP Server Wallets Documentation](https://docs.cdp.coinbase.com/server-wallets/v1/introduction/quickstart)
- [CDP SDK Reference](https://coinbase.github.io/coinbase-sdk-nodejs/)
- [CDP Wallet API](https://docs.cdp.coinbase.com/wallet-api/v2)
- [Security Best Practices](https://docs.cdp.coinbase.com/server-wallets/v1/concepts/wallets)

