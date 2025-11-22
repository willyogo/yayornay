# Server Wallets Setup - Complete Implementation

## ✅ What's Been Implemented

### 1. Supabase Edge Functions (3 functions)

**Location**: `supabase/functions/`

- **`create-wallet`** - Creates a CDP server wallet for each user
- **`get-wallet`** - Retrieves public wallet information
- **`send-transaction`** - Sends transactions using server wallets

### 2. Database Migration

**Location**: `supabase/migrations/20250122000000_create_server_wallets_table.sql`

Creates the `server_wallets` table with:
- User address mapping
- Server wallet ID and address
- Wallet data storage (should be encrypted in production)
- Proper indexes and RLS policies

### 3. Frontend Integration

**Files Created**:
- `src/lib/serverWallet.ts` - Client utilities for Edge Functions
- `src/hooks/useServerWallet.ts` - React hook for server wallet management
- Updated `src/hooks/useVoting.ts` - Now supports server wallets

### 4. Documentation

- `docs/architecture/server-wallets-implementation.md` - Implementation guide
- `docs/guides/production-deployment.md` - Production deployment guide

## 🚀 Quick Start

### Step 1: Install CDP SDK

The Edge Functions need the CDP SDK. Make sure it's available:

```bash
# The SDK will be installed via npm: specifier in Deno
# No action needed - Edge Functions handle this automatically
```

### Step 2: Deploy Database Migration

```bash
supabase db push
```

### Step 3: Set Environment Variables in Supabase

Go to Supabase Dashboard → Settings → Edge Functions → Secrets:

- `VITE_CDP_API_KEY` = Your CDP API key name
- `VITE_CDP_API_SECRET` = Your CDP private key
- `VITE_SUPABASE_URL` = Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

### Step 4: Deploy Edge Functions

```bash
supabase functions deploy create-wallet
supabase functions deploy get-wallet
supabase functions deploy send-transaction
```

### Step 5: Use in Your App

```typescript
import { useServerWallet } from './hooks/useServerWallet';

function MyComponent() {
  const { serverWalletAddress, loading } = useServerWallet();
  
  // serverWalletAddress is automatically created/retrieved
  // Use it for gasless transactions!
}
```

## 📋 Environment Variables

The Edge Functions will look for these environment variables (in order):

1. Supabase Secrets (recommended for production)
2. Environment variables from `.env` file

**CDP Credentials**:
- `VITE_CDP_API_KEY`
- `VITE_CDP_API_SECRET`

**Supabase Credentials**:
- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`

## 🔒 Security Notes

⚠️ **Important for Production**:

1. **Encrypt wallet_data**: The `wallet_data` field contains sensitive information. Encrypt it before storing in production.

2. **Use MPC Wallets**: For production, modify `create-wallet/index.ts` to use:
   ```typescript
   const wallet = await Wallet.create({
     networkId: 'base-sepolia',
     walletConfig: { type: 'COINBASE_MANAGED' } // 2-of-2 MPC
   });
   ```

3. **Enable JWT Verification**: Update `supabase/config.toml` to require JWT:
   ```toml
   [functions.create-wallet]
   verify_jwt = true
   ```

4. **Rate Limiting**: Implement rate limiting on Edge Functions

5. **IP Whitelisting**: Enable IP whitelisting in CDP portal

## 🧪 Testing

### Test Wallet Creation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-wallet \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x1234..."}'
```

### Test Transaction

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-transaction \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x1234...",
    "to": "0x5678...",
    "amount": "1000000000000000000",
    "currency": "ETH"
  }'
```

## 📚 Next Steps

1. **Fund Server Wallets**: Send test ETH to server wallet addresses
2. **Test Transactions**: Try sending transactions via server wallets
3. **Implement Gasless Voting**: Use server wallets for gasless vote submissions
4. **Add Encryption**: Encrypt `wallet_data` before storing
5. **Monitor Usage**: Track wallet creation and transaction costs

## 🐛 Troubleshooting

### "Missing CDP API credentials"
- Check Supabase secrets are set correctly
- Verify environment variable names match

### "Server wallet not found"
- Ensure wallet was created successfully
- Check user_address matches exactly (case-sensitive)

### "Failed to send transaction"
- Verify server wallet has sufficient balance
- Check network_id matches (base-sepolia)
- Verify transaction parameters are valid

### Edge Function deployment fails
- Check Supabase CLI is installed and logged in
- Verify project is linked: `supabase link`
- Check function logs: `supabase functions logs <function-name>`

## 📖 Additional Resources

- [CDP Server Wallets Docs](https://docs.cdp.coinbase.com/server-wallets/v1/introduction/quickstart)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [CDP SDK Reference](https://coinbase.github.io/coinbase-sdk-nodejs/)

