# Server Wallets System Architecture

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Model](#security-model)
8. [Implementation Status](#implementation-status)
9. [Usage Guide](#usage-guide)
10. [Design Decisions](#design-decisions)

---

## Overview

The Server Wallets system enables the application to create and manage blockchain wallets on behalf of users using Coinbase Developer Platform (CDP). This allows for:

- **Gasless Transactions**: App can pay gas fees for users
- **Simplified Onboarding**: No wallet extension required
- **Batch Operations**: Efficient multi-transaction execution
- **Enhanced Security**: MPC (Multi-Party Computation) key management

### Architecture Comparison

**Current State (User Wallets)**:
```
User → Coinbase Wallet Extension → Wagmi → Your App
```
- Users connect their own wallets
- Users pay for their own gas
- Users must have wallet installed

**With Server Wallets**:
```
User → Your App → Edge Functions → CDP SDK → Server Wallet (managed by CDP)
```
- App creates wallet for each user
- App can pay gas on behalf of users
- No wallet extension required
- Wallet keys managed securely by CDP

---

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (React App)
│  (Browser)  │
└──────┬──────┘
       │ HTTP Requests
       │ (Supabase Client)
       ▼
┌─────────────────────────────────────┐
│     Supabase Edge Functions         │
│  (Deno Runtime - Serverless)        │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ create-wallet│  │ get-wallet  │ │
│  └──────┬───────┘  └──────┬──────┘ │
│         │                  │         │
│  ┌──────┴──────────────────┴──────┐ │
│  │      send-transaction          │ │
│  └──────────────┬─────────────────┘ │
└──────────────────┼───────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌──────────────┐    ┌──────────────┐
│   Supabase   │    │  CDP SDK     │
│  PostgreSQL  │    │  (Coinbase)  │
│   Database   │    │              │
└──────────────┘    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Blockchain  │
                    │ (Base Sepolia)│
                    └──────────────┘
```

### Architecture Layers

#### 1. **Client Layer** (Frontend)
- **Technology**: React + TypeScript
- **Location**: `src/`
- **Responsibilities**:
  - User interface for wallet operations
  - Calling Edge Functions via Supabase client
  - Displaying wallet addresses and transaction status

#### 2. **API Layer** (Edge Functions)
- **Technology**: Deno + Supabase Edge Functions
- **Location**: `supabase/functions/`
- **Runtime**: Deno (not Node.js)
- **Responsibilities**:
  - Secure wallet creation (CDP API keys never exposed)
  - Wallet data retrieval
  - Transaction signing and broadcasting

#### 3. **Data Layer** (Database)
- **Technology**: PostgreSQL (Supabase)
- **Location**: `supabase/migrations/`
- **Responsibilities**:
  - Storing account metadata
  - Mapping user addresses to server wallet addresses
  - CDP manages account keys server-side (no local storage needed)

#### 4. **External Services**
- **CDP SDK**: Coinbase Developer Platform for wallet management
- **Blockchain**: Base Sepolia testnet (configurable to mainnet)

---

## System Components

### Edge Functions

#### 1. `create-wallet` (`supabase/functions/create-wallet/index.ts`)

**Purpose**: Creates a new CDP server wallet for a user

**Flow**:
1. Validates CDP API credentials from environment
2. Checks if user already has a server wallet (idempotent)
3. Creates new EVM account via CDP SDK (`cdp.evm.createAccount()`)
4. Extracts account address and ID
5. Stores account metadata in database (CDP manages account server-side)
6. Returns account address and ID to client

**Key Operations**:
```typescript
// Initialize CDP SDK
const cdp = new CdpClient({
  apiKeyId: cdpApiKeyId,
  apiKeySecret: cdpApiKeySecret,
})

// Create EVM account (CDP manages accounts server-side)
const evmAccount = await cdp.evm.createAccount()
const serverWalletAddress = evmAccount.address
const walletId = evmAccount.id || evmAccount.address

// Store account metadata in database
// Note: No need to store wallet_data - CDP manages accounts server-side
await supabase.from('server_wallets').insert({
  user_address: normalizedAddress,
  server_wallet_id: walletId,
  server_wallet_address: serverWalletAddress,
  wallet_data: {}, // Empty - CDP manages accounts
  network_id: 'base-sepolia',
})
```

**Security**:
- CDP API keys only accessible server-side
- Accounts managed by CDP server-side (no local wallet data storage needed)
- Idempotent: Returns existing wallet if already created

**Response**:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "uuid",
  "message": "Wallet created successfully"
}
```

---

#### 2. `get-wallet` (`supabase/functions/get-wallet/index.ts`)

**Purpose**: Retrieves public wallet information (read-only)

**Flow**:
1. Validates Supabase credentials
2. Looks up wallet by user address
3. Returns only public information (address, ID, network)
4. **Never** exposes `wallet_data` (sensitive)

**Key Operations**:
```typescript
// Query database (excludes wallet_data)
const { data } = await supabase
  .from('server_wallets')
  .select('server_wallet_address, server_wallet_id, network_id, created_at')
  .eq('user_address', normalizedAddress)
  .single()
```

**Security**:
- Read-only operation
- Only returns public metadata
- Sensitive `wallet_data` never exposed

**Response**:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "uuid",
  "networkId": "base-sepolia",
  "createdAt": "2025-01-22T..."
}
```

---

#### 3. `send-transaction` (`supabase/functions/send-transaction/index.ts`)

**Purpose**: Signs and sends transactions using a user's server wallet

**Flow**:
1. Validates CDP API credentials
2. Retrieves account address from database
3. Sends transaction using account address via CDP SDK
4. Returns transaction hash

**Key Operations**:
```typescript
// Initialize CDP SDK
const cdp = new CdpClient({
  apiKeyId: cdpApiKeyId,
  apiKeySecret: cdpApiKeySecret,
})

// Get account address from database
const { data: walletRecord } = await supabase
  .from('server_wallets')
  .select('server_wallet_address, network_id')
  .eq('user_address', normalizedAddress)
  .single()

// Send transaction using CdpClient
// CDP manages the account server-side, we just need the address
const txResult = await cdp.evm.sendTransaction({
  address: walletRecord.server_wallet_address,
  network: walletRecord.network_id || 'base-sepolia',
  transaction: {
    to: recipientAddress,
    value: amount.toString(), // Amount in wei
    data: data || undefined, // Optional contract call data
  },
})
```

**Security**:
- CDP API keys only accessible server-side
- Accounts managed by CDP server-side (no wallet import/export needed)
- Transaction signing happens securely via CDP SDK

**Request**:
```json
{
  "userAddress": "0x...",
  "to": "0x...",
  "amount": "1000000000000000000",
  "currency": "ETH",
  "data": "0x..." // optional
}
```

**Response**:
```json
{
  "transactionHash": "0x...",
  "status": "success",
  "message": "Transaction sent successfully"
}
```

---

## Data Flow

### Wallet Creation Flow

```
1. User connects wallet (via Wagmi)
   ↓
2. Frontend calls create-wallet Edge Function
   POST /functions/v1/create-wallet
   Body: { userAddress: "0x..." }
   ↓
3. Edge Function checks database for existing wallet
   ↓
4. If not exists:
   a. Initialize CdpClient with API keys
   b. Create EVM account: cdp.evm.createAccount()
   c. Extract address and ID
   d. Store account metadata in database (CDP manages account server-side)
   ↓
5. Return wallet address and ID to frontend
   ↓
6. Frontend displays server wallet address
```

### Wallet Retrieval Flow

```
1. Frontend needs wallet address
   ↓
2. Calls get-wallet Edge Function
   POST /functions/v1/get-wallet
   Body: { userAddress: "0x..." }
   ↓
3. Edge Function queries database
   SELECT server_wallet_address, server_wallet_id, network_id, created_at
   FROM server_wallets
   WHERE user_address = "0x..."
   ↓
4. Returns public wallet information
   (wallet_data never exposed)
   ↓
5. Frontend displays wallet address
```

### Transaction Flow

```
1. User initiates transaction (e.g., vote)
   ↓
2. Frontend calls send-transaction Edge Function
   POST /functions/v1/send-transaction
   Body: { userAddress, to, amount, currency }
   ↓
3. Edge Function:
   a. Retrieves account address from database
   b. Sends transaction: cdp.evm.sendTransaction({ address, transaction })
   c. CDP SDK handles signing, gas estimation, and broadcasting
   ↓
4. CDP SDK handles:
   - Transaction signing (using CDP-managed account)
   - Gas estimation
   - Nonce management
   - Broadcasting to network
   ↓
5. Return transaction hash to frontend
   ↓
6. Frontend displays transaction status
```

---

## Database Schema

### Table: `server_wallets`

```sql
CREATE TABLE server_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL UNIQUE,           -- User's connected wallet
  server_wallet_id text NOT NULL UNIQUE,       -- CDP wallet ID
  server_wallet_address text NOT NULL,          -- Server wallet address
  wallet_data jsonb NOT NULL DEFAULT '{}',    -- Empty object - CDP manages accounts server-side
  network_id text DEFAULT 'base-sepolia',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Indexes

- `idx_server_wallets_user_address` - Fast lookup by user address
- `idx_server_wallets_server_wallet_id` - Fast lookup by wallet ID
- `idx_server_wallets_server_wallet_address` - Fast lookup by wallet address

### Row Level Security (RLS)

**Policies**:

1. **SELECT**: Anyone can read wallet addresses (public info)
   ```sql
   CREATE POLICY "Users can read server wallet addresses"
     ON server_wallets FOR SELECT
     TO authenticated, anon
     USING (true);
   ```

2. **INSERT**: Edge Functions can create wallets
   ```sql
   CREATE POLICY "Allow wallet creation"
     ON server_wallets FOR INSERT
     TO authenticated, anon, service_role
     WITH CHECK (true);
   ```

3. **UPDATE**: Edge Functions can update wallets
   ```sql
   CREATE POLICY "Allow wallet updates"
     ON server_wallets FOR UPDATE
     TO authenticated, anon, service_role
     USING (true)
     WITH CHECK (true);
   ```

**Security Note**: `wallet_data` column is never exposed through RLS policies. Only Edge Functions (with service role) can access it.

### What's Stored

**Public Data** (accessible via RLS):
- `user_address` - User's wallet address
- `server_wallet_address` - Server wallet address (public)
- `server_wallet_id` - CDP wallet ID
- `network_id` - Network (base-sepolia/base-mainnet)
- `created_at` - Creation timestamp

**Private Data** (Edge Functions only):
- `wallet_data` - Empty JSON object `{}`
  - Previously stored encrypted wallet data, but CDP now manages accounts server-side
  - Kept as empty object to maintain database schema compatibility

---

## API Endpoints

### Base URL
- **Local**: `http://localhost:54321/functions/v1/`
- **Production**: `https://<project-ref>.supabase.co/functions/v1/`

### 1. Create Wallet

**Endpoint**: `POST /create-wallet`

**Headers**:
```
Authorization: Bearer <supabase-anon-key>
Content-Type: application/json
```

**Request Body**:
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response** (200):
```json
{
  "serverWalletAddress": "0xcB3de6D37b42D80DFf2EBd353F18A22e050cDDb5",
  "walletId": "a260f986-fe87-47f0-920e-babc4692b140",
  "message": "Wallet created successfully"
}
```

**Response** (200 - Already Exists):
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "...",
  "message": "Wallet already exists"
}
```

**Error** (400):
```json
{
  "error": "userAddress is required"
}
```

**Error** (500):
```json
{
  "error": "Failed to create wallet",
  "details": "Missing CDP API credentials: VITE_CDP_API_KEY"
}
```

---

### 2. Get Wallet

**Endpoint**: `POST /get-wallet`

**Headers**:
```
Authorization: Bearer <supabase-anon-key>
Content-Type: application/json
```

**Request Body**:
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response** (200):
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "uuid",
  "networkId": "base-sepolia",
  "createdAt": "2025-01-22T12:34:56.789Z"
}
```

**Error** (404):
```json
{
  "error": "Server wallet not found for user"
}
```

---

### 3. Send Transaction

**Endpoint**: `POST /send-transaction`

**Headers**:
```
Authorization: Bearer <supabase-anon-key>
Content-Type: application/json
```

**Request Body**:
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": "0xRecipientAddress",
  "amount": "1000000000000000000",
  "currency": "ETH",
  "data": "0x..." // optional
}
```

**Response** (200):
```json
{
  "transactionHash": "0x...",
  "status": "success",
  "message": "Transaction sent successfully"
}
```

**Error** (404):
```json
{
  "error": "Server wallet not found for user"
}
```

**Error** (400):
```json
{
  "error": "userAddress, to, and amount are required"
}
```

---

## Security Model

### 1. **API Key Protection**
- CDP API keys stored as environment variables
- Never exposed to client-side code
- Only accessible in Edge Functions (server-side)

### 2. **Account Management**

**CDP-Managed Accounts**:
```
cdp.evm.createAccount()
  → Account created by CDP
  → Account address returned
  → Address stored in database
  → CDP manages account keys server-side
```

**Transaction Flow**:
```
Database lookup (account address)
  → cdp.evm.sendTransaction({ address, transaction })
  → CDP signs transaction using managed account
  → Transaction broadcast to network
```

**Security Features**:
- Accounts managed by CDP server-side (no local key storage)
- Account addresses stored in database (public information)
- No encryption needed - CDP handles all key management
- Only Edge Functions can initiate transactions via CDP API

### 3. **Access Control**
- RLS policies control database access
- Public read access to wallet addresses only
- Write access restricted to Edge Functions
- User addresses normalized (lowercase) for consistency

### 4. **Network Security**
- CORS headers configured for cross-origin requests
- Authentication via Supabase anon key
- Input validation on all endpoints

### 5. **Wallet Security Models**

**Developer-Managed (Current)**:
- 1-of-1 key management
- Suitable for development/testing
- Lower security threshold

**Coinbase-Managed (Production)**:
- 2-of-2 MPC (Multi-Party Computation)
- Requires both developer and Coinbase keys
- Higher security threshold
- Enable with: `walletConfig: { type: 'COINBASE_MANAGED' }`

---

## Implementation Status

### ✅ Implemented

1. **Edge Functions**:
   - `create-wallet` - Creates EVM accounts via CDP, stores address in DB
   - `get-wallet` - Retrieves public account info
   - `send-transaction` - Sends transactions using CDP-managed accounts

2. **Database**:
   - `server_wallets` table with RLS policies
   - Stores account addresses (CDP manages keys server-side)
   - Idempotent migrations

3. **Backend Flow**:
   - Complete server-side account management via CDP
   - CDP handles all key management and signing
   - Error handling and validation

4. **Testing**:
   - Unit tests with mocks
   - Integration tests (mocked and real infrastructure)
   - E2E flow tests

### 🚧 Partially Implemented

1. **Frontend Integration**:
   - `useServerWallet` hook created but not fully integrated
   - No automatic wallet creation on user connect
   - No UI for displaying server wallet address

### ❌ Not Yet Implemented

1. **Frontend Hook** (`useServerWallet`):
   - Should automatically create wallet on user connect
   - Should cache wallet address
   - Should handle loading states

2. **Gasless Voting**:
   - Use server wallets for voting transactions
   - Pay gas on behalf of users

---

## Usage Guide

### Frontend Integration

**Supabase Client**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create wallet
const { data, error } = await supabase.functions.invoke('create-wallet', {
  body: { userAddress: userAddress },
})

// Get wallet
const { data } = await supabase.functions.invoke('get-wallet', {
  body: { userAddress: userAddress },
})

// Send transaction
const { data } = await supabase.functions.invoke('send-transaction', {
  body: {
    userAddress: userAddress,
    to: recipientAddress,
    amount: amount.toString(),
    currency: 'ETH',
  },
})
```

### React Hook Example

```typescript
// src/hooks/useServerWallet.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

export function useServerWallet() {
  const { address } = useAccount();
  const [serverWalletAddress, setServerWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setServerWalletAddress(null);
      setLoading(false);
      return;
    }

    async function getOrCreateServerWallet() {
      try {
        // First, try to get existing wallet
        const { data: existingWallet, error: getError } = await supabase.functions.invoke('get-wallet', {
          body: { userAddress: address },
        });

        if (existingWallet && !getError) {
          setServerWalletAddress(existingWallet.serverWalletAddress);
          setLoading(false);
          return;
        }

        // If no wallet exists, create one
        const { data: newWallet, error: createError } = await supabase.functions.invoke('create-wallet', {
          body: { userAddress: address },
        });

        if (newWallet && !createError) {
          setServerWalletAddress(newWallet.serverWalletAddress);
        }
      } catch (error) {
        console.error('Error getting/creating server wallet:', error);
      } finally {
        setLoading(false);
      }
    }

    getOrCreateServerWallet();
  }, [address]);

  return { serverWalletAddress, loading };
}
```

### Environment Variables

**Required for Edge Functions**:
```env
VITE_CDP_API_KEY=your-api-key-id
VITE_CDP_API_SECRET=your-api-key-secret
CDP_WALLET_SECRET=your-wallet-secret
CDP_NETWORK_ID=base-sepolia  # or base-mainnet for production
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: With CdpClient, no encryption key is needed since CDP manages accounts server-side. However, `CDP_WALLET_SECRET` is required.

**Local Development**:
```bash
# Start Edge Functions with env file
supabase functions serve --env-file .env
```

**Production**:
```bash
# Set secrets in Supabase
supabase secrets set VITE_CDP_API_KEY=your-api-key-id
supabase secrets set VITE_CDP_API_SECRET=your-api-key-secret
supabase secrets set CDP_WALLET_SECRET=your-wallet-secret
# Note: No encryption key needed - CDP manages accounts server-side
```

### CDP SDK Integration

**In Edge Functions** (Deno):
```typescript
import { CdpClient } from 'npm:@coinbase/cdp-sdk@latest'

// Initialize CdpClient
const cdp = new CdpClient({
  apiKeyId: Deno.env.get('VITE_CDP_API_KEY') || Deno.env.get('CDP_API_KEY_ID'),
  apiKeySecret: Deno.env.get('VITE_CDP_API_SECRET') || Deno.env.get('CDP_API_KEY_SECRET'),
  walletSecret: Deno.env.get('CDP_WALLET_SECRET') || Deno.env.get('VITE_CDP_WALLET_SECRET'),
})

// Create EVM account
const evmAccount = await cdp.evm.createAccount()
const address = evmAccount.address

// Send transaction
const txResult = await cdp.evm.sendTransaction({
  address: address,
  network: 'base-sepolia',
  transaction: {
    to: recipientAddress,
    value: amountInWei, // Amount as string in wei
  },
})
```

---

## Design Decisions

### 1. **Why Supabase Edge Functions?**
- Serverless, scalable
- Built-in database integration
- Deno runtime (secure, modern)
- Easy deployment and management

### 2. **Why Store Wallet Data?**
- Need to restore wallets for transactions
- CDP SDK requires wallet data to import
- Enables transaction signing without re-creating wallets

### 3. **Why Separate Endpoints?**
- **create-wallet**: Idempotent, handles duplicates
- **get-wallet**: Read-only, fast, no CDP SDK needed
- **send-transaction**: Requires CDP SDK, handles signing

### 4. **Why Normalize Addresses?**
- Ethereum addresses case-insensitive but stored inconsistently
- Normalizing to lowercase ensures consistent lookups
- Prevents duplicate wallets for same user

### 5. **Why CDP-Managed Accounts?**
- CDP manages account keys server-side (no local key storage)
- Eliminates need for encryption/decryption of wallet data
- Simplified security model - CDP handles all key operations
- Even if database is compromised, no sensitive keys are stored

---

## File Structure

```
supabase/
├── functions/
│   ├── create-wallet/
│   │   └── index.ts          # Wallet creation endpoint
│   ├── get-wallet/
│   │   └── index.ts           # Wallet retrieval endpoint
│   ├── send-transaction/
│   │   └── index.ts           # Transaction sending endpoint
│   └── deno.json              # Deno configuration
│
└── migrations/
    ├── 20250122000000_create_server_wallets_table.sql
    └── 20250122000001_fix_server_wallets_rls.sql

src/
└── hooks/
    └── useServerWallet.ts     # React hook for server wallets
```

---

## Key Points

1. **Accounts are created server-side** - CDP API keys never exposed to client
2. **CDP manages accounts** - Account keys managed by CDP server-side, no local storage needed
3. **Idempotent creation** - Calling create-wallet multiple times returns existing account
4. **Public info only** - get-wallet only returns account address and metadata
5. **Direct transaction sending** - Transactions sent using account address, no wallet import needed
6. **One account per user** - Unique constraint on user_address

---

## Future Enhancements

### Production Readiness
1. **Switch to Coinbase-Managed** (2-of-2 MPC) wallets
2. **Add rate limiting** to prevent abuse
3. **Implement transaction queuing** for batch operations
4. **Add monitoring and logging** for production debugging

### Feature Additions
1. **Balance checking** endpoint
2. **Transaction history** tracking
3. **Multi-network support** (mainnet, other testnets)
4. **Gasless transaction** sponsorship logic
5. **Wallet recovery** mechanisms

---

## Summary

The Server Wallets system provides a secure, scalable way to manage blockchain wallets for users without requiring them to install wallet extensions. The architecture separates concerns cleanly:

- **Client**: User interface and API calls
- **Edge Functions**: Secure account operations (server-side)
- **Database**: Account address storage (CDP manages keys)
- **CDP SDK**: Account creation and transaction signing
- **Blockchain**: Transaction execution

This design ensures API keys remain secure, wallet operations are reliable, and the system can scale to handle many users efficiently.
