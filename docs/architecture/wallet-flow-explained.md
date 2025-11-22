# Server Wallet Flow - Complete Explanation

## Overview

This document explains the complete flow of how server wallets are created, stored, retrieved, and used in the system.

---

## 🎯 When Are Wallets Created?

**Server wallets are created on-demand** when a user first needs one. Currently, wallets are created:

1. **Manually via API call** - When frontend calls `create-wallet` Edge Function
2. **Lazily** - When user first needs to perform a transaction (future implementation)

**Note**: There's no automatic wallet creation on user registration yet. The frontend hook (`useServerWallet`) would handle this, but it's not fully implemented.

---

## 📊 Complete Wallet Flow

### Phase 1: Wallet Creation

```
┌─────────────┐
│   User      │ Connects wallet (via Wagmi)
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User connects wallet
       │    address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
       ▼
┌─────────────────────────────────────┐
│   Frontend (React App)              │
│                                     │
│   Calls: create-wallet Edge Function│
│   POST /functions/v1/create-wallet  │
│   Body: { userAddress: "0x..." }   │
└──────────────┬──────────────────────┘
               │
               │ HTTP Request
               │ (with Supabase anon key)
               ▼
┌─────────────────────────────────────┐
│   Edge Function: create-wallet      │
│   (Deno Runtime)                   │
│                                     │
│   1. Validates CDP API credentials │
│   2. Checks if wallet exists        │
│      SELECT * FROM server_wallets   │
│      WHERE user_address = "0x..."  │
│                                     │
│   3. If exists: Return existing    │
│   4. If not: Create new wallet     │
└──────────────┬──────────────────────┘
               │
               │ CDP SDK Call
               ▼
┌─────────────────────────────────────┐
│   Coinbase Developer Platform       │
│   (CDP SDK)                         │
│                                     │
│   Wallet.create({                   │
│     networkId: 'base-sepolia'       │
│   })                                │
│                                     │
│   Returns:                          │
│   - Wallet object                   │
│   - Wallet ID (UUID)                │
│   - Default address                 │
└──────────────┬──────────────────────┘
               │
               │ Wallet Data
               ▼
┌─────────────────────────────────────┐
│   Edge Function (continued)        │
│                                     │
│   5. Extract wallet info:          │
│      - address.id → server address  │
│      - address.model.wallet_id      │
│                                     │
│   6. Export wallet data:            │
│      wallet.export() → JSON          │
│                                     │
│   7. Encrypt wallet data:           │
│      encryptWalletData() → Base64   │
│                                     │
│   8. Store in database:              │
│      INSERT INTO server_wallets     │
└──────────────┬──────────────────────┘
               │
               │ Database Insert
               ▼
┌─────────────────────────────────────┐
│   Supabase PostgreSQL Database      │
│                                     │
│   Table: server_wallets             │
│   ┌─────────────────────────────┐  │
│   │ id: uuid                    │  │
│   │ user_address: "0x..."       │  │
│   │ server_wallet_id: "uuid"    │  │
│   │ server_wallet_address: "0x" │  │
│   │ wallet_data: "encrypted"    │  │
│   │ network_id: "base-sepolia"  │  │
│   │ created_at: timestamp       │  │
│   └─────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
               │ Response
               ▼
┌─────────────────────────────────────┐
│   Frontend receives:               │
│   {                                │
│     serverWalletAddress: "0x...", │
│     walletId: "uuid",              │
│     message: "Wallet created"      │
│   }                                │
└─────────────────────────────────────┘
```

---

### Phase 2: Wallet Retrieval

```
┌─────────────┐
│   Frontend  │ Needs wallet address
└──────┬──────┘
       │
       │ GET /functions/v1/get-wallet?userAddress=0x...
       ▼
┌─────────────────────────────────────┐
│   Edge Function: get-wallet        │
│                                     │
│   1. Query database:                │
│      SELECT                          │
│        server_wallet_address,        │
│        server_wallet_id,             │
│        network_id,                   │
│        created_at                    │
│      FROM server_wallets            │
│      WHERE user_address = "0x..."  │
│                                     │
│   ⚠️  Does NOT return wallet_data   │
│      (sensitive, encrypted)         │
└──────────────┬──────────────────────┘
               │
               │ Response
               ▼
┌─────────────────────────────────────┐
│   Frontend receives:               │
│   {                                │
│     serverWalletAddress: "0x...",  │
│     walletId: "uuid",              │
│     networkId: "base-sepolia",     │
│     createdAt: "2025-01-22..."     │
│   }                                │
└─────────────────────────────────────┘
```

---

### Phase 3: Using Wallet for Transactions

```
┌─────────────┐
│   User      │ Wants to send transaction
│  (Frontend) │ (e.g., vote, transfer)
└──────┬──────┘
       │
       │ POST /functions/v1/send-transaction
       │ {
       │   userAddress: "0x...",
       │   to: "0xRecipient",
       │   amount: "1000000000000000000",
       │   currency: "ETH"
       │ }
       ▼
┌─────────────────────────────────────┐
│   Edge Function: send-transaction  │
│                                     │
│   1. Retrieve wallet from DB:       │
│      SELECT * FROM server_wallets  │
│      WHERE user_address = "0x..."  │
│                                     │
│   2. Decrypt wallet_data:           │
│      decryptWalletData() → JSON     │
│                                     │
│   3. Import wallet:                 │
│      Wallet.import(decryptedData)   │
│                                     │
│   4. Sign transaction:              │
│      wallet.send({                  │
│        to, amount, currency         │
│      })                             │
│                                     │
│   5. Broadcast to blockchain       │
└──────────────┬──────────────────────┘
               │
               │ Transaction Hash
               ▼
┌─────────────────────────────────────┐
│   Frontend receives:               │
│   {                                │
│     transactionHash: "0x...",      │
│     status: "success"               │
│   }                                │
└─────────────────────────────────────┘
```

---

## 🗄️ Database Storage

### Table Structure

```sql
CREATE TABLE server_wallets (
  id uuid PRIMARY KEY,
  user_address text NOT NULL UNIQUE,        -- User's connected wallet
  server_wallet_id text NOT NULL UNIQUE,   -- CDP wallet UUID
  server_wallet_address text NOT NULL,      -- Server wallet address (0x...)
  wallet_data jsonb NOT NULL,               -- Encrypted wallet data
  network_id text DEFAULT 'base-sepolia',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### What's Stored

**Public Data** (accessible via RLS):
- `user_address` - User's wallet address
- `server_wallet_address` - Server wallet address (public)
- `server_wallet_id` - CDP wallet ID
- `network_id` - Network (base-sepolia/base-mainnet)
- `created_at` - Creation timestamp

**Private Data** (encrypted, Edge Functions only):
- `wallet_data` - Encrypted JSON containing:
  - Wallet ID
  - Wallet configuration
  - Network information
  - Other CDP SDK wallet metadata

**⚠️ Security**: `wallet_data` is:
- Encrypted with AES-GCM-256 before storage
- Never exposed via RLS policies
- Only accessible to Edge Functions (service role)
- Decrypted only when needed for transactions

---

## 🔐 Security Flow

### Encryption Process

```
Wallet.export() 
  → JSON object
  → encryptWalletData() 
  → AES-GCM-256 encryption
  → Base64 string
  → Stored in database
```

### Decryption Process

```
Database (encrypted Base64)
  → decryptWalletData()
  → AES-GCM-256 decryption
  → JSON string
  → JSON.parse()
  → Wallet object
  → Wallet.import()
  → Ready for transactions
```

---

## 📍 Current Implementation Status

### ✅ Implemented

1. **Edge Functions**:
   - `create-wallet` - Creates wallets, encrypts data, stores in DB
   - `get-wallet` - Retrieves public wallet info
   - `send-transaction` - Decrypts wallet, signs transactions

2. **Database**:
   - `server_wallets` table with RLS policies
   - Encryption/decryption utilities

3. **Backend Flow**:
   - Complete server-side wallet management
   - Secure encryption/decryption

### ⚠️ Partially Implemented

1. **Frontend Integration**:
   - `useVoting` hook imports `useServerWallet` but hook doesn't exist
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

## 🔄 Complete User Journey

### Scenario: User Connects Wallet

```
1. User opens app
   ↓
2. User clicks "Connect Wallet"
   ↓
3. Wagmi connects user's wallet
   ↓
4. [NOT YET] useServerWallet hook detects connection
   ↓
5. [NOT YET] Hook calls create-wallet Edge Function
   ↓
6. [NOT YET] Wallet created and stored
   ↓
7. [NOT YET] Hook caches server wallet address
   ↓
8. User can now use app
```

### Scenario: User Votes (Future)

```
1. User swipes right on proposal
   ↓
2. useVoting hook called
   ↓
3. Check if serverWalletAddress exists
   ↓
4. If yes: Call send-transaction Edge Function
   ↓
5. Edge Function:
   - Retrieves encrypted wallet_data
   - Decrypts wallet
   - Signs vote transaction
   - Broadcasts to blockchain
   ↓
6. Transaction hash returned
   ↓
7. Vote recorded on-chain (gasless!)
```

---

## 🛠️ How to Use Right Now

### Manual Wallet Creation

```typescript
// In your React component
import { supabase } from './lib/supabase';
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  
  const createWallet = async () => {
    if (!address) return;
    
    const { data, error } = await supabase.functions.invoke('create-wallet', {
      body: { userAddress: address },
    });
    
    if (data) {
      console.log('Server wallet:', data.serverWalletAddress);
    }
  };
  
  // Call createWallet() when user connects
}
```

### Get Wallet Address

```typescript
const getWallet = async (userAddress: string) => {
  const { data, error } = await supabase.functions.invoke('get-wallet', {
    body: { userAddress },
  });
  
  return data?.serverWalletAddress;
};
```

### Send Transaction

```typescript
const sendTransaction = async (
  userAddress: string,
  to: string,
  amount: string
) => {
  const { data, error } = await supabase.functions.invoke('send-transaction', {
    body: {
      userAddress,
      to,
      amount,
      currency: 'ETH',
    },
  });
  
  return data?.transactionHash;
};
```

---

## 📝 Key Points

1. **Wallets are created server-side** - CDP API keys never exposed to client
2. **Wallet data is encrypted** - AES-GCM-256 encryption before storage
3. **Idempotent creation** - Calling create-wallet multiple times returns existing wallet
4. **Public info only** - get-wallet never exposes encrypted wallet_data
5. **On-demand decryption** - Wallet only decrypted when needed for transactions
6. **One wallet per user** - Unique constraint on user_address

---

## 🚀 Next Steps

To complete the wallet flow:

1. **Implement `useServerWallet` hook**:
   ```typescript
   // src/hooks/useServerWallet.ts
   export function useServerWallet() {
     const { address } = useAccount();
     // Auto-create wallet on connect
     // Cache wallet address
     // Return loading state
   }
   ```

2. **Integrate with voting**:
   - Use server wallet for gasless votes
   - Update `useVoting` to use `send-transaction`

3. **Add UI**:
   - Display server wallet address
   - Show wallet balance
   - Transaction history

---

## Summary

**Current State**:
- ✅ Backend fully functional (create, get, send-transaction)
- ✅ Database schema and encryption in place
- ⚠️ Frontend integration incomplete (hook missing)
- ❌ Automatic wallet creation not implemented

**Flow**:
1. User connects wallet → Frontend calls `create-wallet`
2. Edge Function creates CDP wallet → Encrypts → Stores in DB
3. Frontend calls `get-wallet` → Gets public address
4. User wants transaction → Frontend calls `send-transaction`
5. Edge Function decrypts wallet → Signs → Broadcasts

The infrastructure is ready - just needs frontend hook implementation to tie it all together!


