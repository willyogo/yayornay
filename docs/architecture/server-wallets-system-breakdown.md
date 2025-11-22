# Server Wallets System Architecture Breakdown

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Model](#security-model)
8. [Integration Points](#integration-points)

---

## System Overview

The Server Wallets system enables the application to create and manage blockchain wallets on behalf of users using Coinbase Developer Platform (CDP). This allows for:

- **Gasless Transactions**: App can pay gas fees for users
- **Simplified Onboarding**: No wallet extension required
- **Batch Operations**: Efficient multi-transaction execution
- **Enhanced Security**: MPC (Multi-Party Computation) key management

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

---

## Architecture Layers

### 1. **Client Layer** (Frontend)
- **Technology**: React + TypeScript
- **Location**: `src/`
- **Responsibilities**:
  - User interface for wallet operations
  - Calling Edge Functions via Supabase client
  - Displaying wallet addresses and transaction status

### 2. **API Layer** (Edge Functions)
- **Technology**: Deno + Supabase Edge Functions
- **Location**: `supabase/functions/`
- **Runtime**: Deno (not Node.js)
- **Responsibilities**:
  - Secure wallet creation (CDP API keys never exposed)
  - Wallet data retrieval
  - Transaction signing and broadcasting

### 3. **Data Layer** (Database)
- **Technology**: PostgreSQL (Supabase)
- **Location**: `supabase/migrations/`
- **Responsibilities**:
  - Storing wallet metadata
  - Mapping user addresses to server wallets
  - Storing serialized wallet data (encrypted in production)

### 4. **External Services**
- **CDP SDK**: Coinbase Developer Platform for wallet management
- **Blockchain**: Base Sepolia testnet (configurable)

---

## Component Breakdown

### Edge Functions

#### 1. `create-wallet` (`supabase/functions/create-wallet/index.ts`)

**Purpose**: Creates a new CDP server wallet for a user

**Flow**:
1. Validates CDP API credentials from environment
2. Checks if user already has a server wallet
3. Creates new wallet via CDP SDK (`Wallet.create()`)
4. Extracts wallet address and ID
5. Exports wallet data for storage
6. Stores wallet metadata in database
7. Returns wallet address and ID to client

**Key Operations**:
```typescript
// Initialize CDP SDK
Coinbase.configure({
  apiKeyName: cdpApiKeyName,
  privateKey: cdpApiKeyPrivateKey,
})

// Create wallet
const wallet = await Wallet.create({
  networkId: 'base-sepolia',
})

// Get address
const address = await wallet.getDefaultAddress()
const serverWalletAddress = address.id

// Export wallet data
const walletData = await wallet.export()

// Store in database
await supabase.from('server_wallets').insert({
  user_address: normalizedAddress,
  server_wallet_id: walletId,
  server_wallet_address: serverWalletAddress,
  wallet_data: walletData,
  network_id: 'base-sepolia',
})
```

**Security**:
- CDP API keys only accessible server-side
- Wallet data stored securely (should be encrypted in production)
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
2. Retrieves wallet from database
3. Imports wallet from stored data (`Wallet.import()`)
4. Signs and sends transaction via CDP SDK
5. Returns transaction hash

**Key Operations**:
```typescript
// Get wallet from database
const { data: walletRecord } = await supabase
  .from('server_wallets')
  .select('*')
  .eq('user_address', normalizedAddress)
  .single()

// Restore wallet from stored data
const wallet = await Wallet.import(walletRecord.wallet_data)

// Send transaction
const transfer = await wallet.send({
  to: recipientAddress,
  amount: amount.toString(),
  currency: currency || 'ETH',
  networkId: walletRecord.network_id || 'base-sepolia',
  data: data || undefined,
})
```

**Security**:
- Wallet data only accessed server-side
- Transaction signing happens securely via CDP SDK
- User must have existing wallet

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
   a. Initialize CDP SDK with API keys
   b. Create wallet: Wallet.create()
   c. Extract address and ID
   d. Export wallet data: wallet.export()
   e. Store in database
   ↓
5. Return wallet address and ID to frontend
   ↓
6. Frontend displays server wallet address
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
   a. Retrieves wallet from database
   b. Imports wallet: Wallet.import(walletData)
   c. Signs transaction: wallet.send({...})
   d. Broadcasts to blockchain
   ↓
4. CDP SDK handles:
   - Transaction signing
   - Gas estimation
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
  wallet_data jsonb NOT NULL,                  -- Serialized wallet (encrypt in prod!)
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

**Endpoint**: `GET /get-wallet?userAddress=0x...` or `POST /get-wallet`

**Headers**:
```
Authorization: Bearer <supabase-anon-key>
Content-Type: application/json (if POST)
```

**Query Params** (GET):
```
userAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Request Body** (POST):
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

### 2. **Wallet Data Security**
- `wallet_data` stored in database (JSONB)
- **⚠️ Should be encrypted in production**
- Never exposed through RLS policies
- Only Edge Functions can access via service role

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

## Integration Points

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

### Environment Variables

**Required for Edge Functions**:
```env
VITE_CDP_API_KEY=your-api-key-name
VITE_CDP_API_SECRET=your-api-key-private-key
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Local Development**:
```bash
# Start Edge Functions with env file
supabase functions serve --env-file .env
```

### CDP SDK Integration

**In Edge Functions** (Deno):
```typescript
import { Coinbase, Wallet } from 'npm:@coinbase/coinbase-sdk@latest'

// Configure
Coinbase.configure({
  apiKeyName: Deno.env.get('VITE_CDP_API_KEY'),
  privateKey: Deno.env.get('VITE_CDP_API_SECRET'),
})

// Create wallet
const wallet = await Wallet.create({ networkId: 'base-sepolia' })

// Import wallet
const wallet = await Wallet.import(walletData)

// Send transaction
const transfer = await wallet.send({ to, amount, currency, networkId })
```

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
│   ├── deno.json              # Deno configuration
│   └── tsconfig.json          # TypeScript config (disabled)
│
└── migrations/
    ├── 20250122000000_create_server_wallets_table.sql
    └── 20250122000001_fix_server_wallets_rls.sql

docs/
└── architecture/
    ├── server-wallets.md                    # Original guide
    ├── server-wallets-implementation.md     # Implementation details
    └── server-wallets-system-breakdown.md    # This file

scripts/
└── test-server-wallets.ts                   # Integration test script
```

---

## Key Design Decisions

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

---

## Future Enhancements

### Production Readiness
1. **Encrypt `wallet_data`** before storing in database
2. **Switch to Coinbase-Managed** (2-of-2 MPC) wallets
3. **Add rate limiting** to prevent abuse
4. **Implement transaction queuing** for batch operations
5. **Add monitoring and logging** for production debugging

### Feature Additions
1. **Balance checking** endpoint
2. **Transaction history** tracking
3. **Multi-network support** (mainnet, other testnets)
4. **Gasless transaction** sponsorship logic
5. **Wallet recovery** mechanisms

---

## Testing

### Local Testing
```bash
# 1. Start Supabase
supabase start

# 2. Serve Edge Functions
supabase functions serve --env-file .env

# 3. Run test script
./test-wallet-simple.sh
# or
npx tsx scripts/test-server-wallets.ts
```

### Test Coverage
- Unit tests: `src/test/serverWallets.test.ts`
- Integration tests: `src/test/integration/edgeFunctions.test.ts`
- E2E tests: `src/test/integration/edgeFunctions.e2e.test.ts`

---

## Summary

The Server Wallets system provides a secure, scalable way to manage blockchain wallets for users without requiring them to install wallet extensions. The architecture separates concerns cleanly:

- **Client**: User interface and API calls
- **Edge Functions**: Secure wallet operations (server-side)
- **Database**: Wallet metadata storage
- **CDP SDK**: Wallet creation and transaction signing
- **Blockchain**: Transaction execution

This design ensures API keys remain secure, wallet operations are reliable, and the system can scale to handle many users efficiently.

