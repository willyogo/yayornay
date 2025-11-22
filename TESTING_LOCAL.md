# Local Testing Guide for Server Wallets

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Docker Desktop** running (required for local Supabase)

3. **CDP API Credentials** (or use test/mock mode)

## Step 1: Start Supabase Locally

```bash
# Initialize Supabase (if not already done)
supabase init

# Start local Supabase instance
supabase start
```

This will:
- Start PostgreSQL database
- Start Supabase Studio (usually at http://localhost:54323)
- Start API server (usually at http://localhost:54321)
- Create local project

**Note**: Save the output - it contains your local credentials!

## Step 2: Set Up Local Environment Variables

Create or update `.env.local` (or `.env`) with local Supabase credentials:

```env
# Local Supabase (from 'supabase start' output)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your-local-anon-key>

# CDP Credentials
VITE_CDP_API_KEY=your-cdp-api-key-name
VITE_CDP_API_SECRET=your-cdp-api-key-private-key
```

## Step 3: Apply Database Migration Locally

```bash
# Reset local database (optional - starts fresh)
supabase db reset

# Or just apply migrations
supabase db push
```

Verify the migration:
```bash
# Connect to local database
supabase db psql

# Check if table exists
SELECT * FROM server_wallets LIMIT 1;
```

## Step 4: Set Edge Function Secrets (Local)

Edge Functions can access environment variables. For local testing, you can:

### Option A: Use .env file (simplest)
The Edge Functions will automatically read from your `.env` file when running locally.

### Option B: Set secrets explicitly
```bash
# Set secrets for local functions
supabase secrets set VITE_CDP_API_KEY=your-key-name
supabase secrets set VITE_CDP_API_SECRET=your-private-key
supabase secrets set VITE_SUPABASE_URL=http://localhost:54321
supabase secrets set VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

## Step 5: Serve Edge Functions Locally

```bash
# Serve all functions
supabase functions serve

# Or serve specific function
supabase functions serve create-wallet

# Functions will be available at:
# http://localhost:54321/functions/v1/create-wallet
# http://localhost:54321/functions/v1/get-wallet
# http://localhost:54321/functions/v1/send-transaction
```

**Note**: Keep this terminal running while testing!

## Step 6: Test Edge Functions Directly

### Test create-wallet

```bash
curl -X POST http://localhost:54321/functions/v1/create-wallet \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

Expected response:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "...",
  "message": "Wallet created successfully"
}
```

### Test get-wallet

```bash
curl -X GET "http://localhost:54321/functions/v1/get-wallet?userAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY"
```

### Test send-transaction (requires funded wallet)

```bash
curl -X POST http://localhost:54321/functions/v1/send-transaction \
  -H "Authorization: Bearer YOUR_LOCAL_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "to": "0xRecipientAddress",
    "amount": "1000000000000000000",
    "currency": "ETH"
  }'
```

## Step 7: Test Frontend Integration

### Update Frontend to Use Local Supabase

Make sure your frontend is pointing to local Supabase:

```typescript
// src/lib/supabase.ts should use:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
```

### Start Frontend Dev Server

```bash
pnpm dev
# or
npm run dev
```

### Test in Browser

1. **Open browser** to `http://localhost:5173` (or your Vite port)
2. **Connect wallet** using WalletConnect component
3. **Check console** - `useServerWallet` hook should automatically:
   - Detect connected wallet
   - Call `create-wallet` Edge Function
   - Store wallet in local database
   - Return server wallet address

### Verify in Supabase Studio

1. Open http://localhost:54323 (Supabase Studio)
2. Go to **Table Editor** → `server_wallets`
3. You should see the created wallet!

## Step 8: Debugging Tips

### View Edge Function Logs

```bash
# In a separate terminal
supabase functions logs create-wallet --follow

# Or view all logs
supabase functions logs
```

### Check Database

```bash
# Connect to local database
supabase db psql

# Query server_wallets
SELECT * FROM server_wallets;

# Check specific user
SELECT * FROM server_wallets WHERE user_address = '0x...';
```

### Test with Mock Data (Without CDP)

If you don't have CDP credentials yet, you can temporarily modify the Edge Functions to return mock data:

```typescript
// In create-wallet/index.ts (temporary for testing)
if (Deno.env.get('MOCK_MODE') === 'true') {
  return new Response(
    JSON.stringify({
      serverWalletAddress: '0x' + '0'.repeat(40), // Mock address
      walletId: 'mock-wallet-id',
      message: 'Mock wallet created',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Then set `MOCK_MODE=true` in your environment.

## Step 9: Integration Test Script

Create a test script to verify everything works:

```typescript
// scripts/test-server-wallets.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const anonKey = 'YOUR_LOCAL_ANON_KEY'; // From supabase start output

const supabase = createClient(supabaseUrl, anonKey);

async function testServerWallets() {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  console.log('🧪 Testing Server Wallets...\n');

  // Test 1: Create wallet
  console.log('1. Creating wallet...');
  const { data: createData, error: createError } = await supabase.functions.invoke('create-wallet', {
    body: { userAddress: testAddress },
  });

  if (createError) {
    console.error('❌ Create failed:', createError);
    return;
  }
  console.log('✅ Wallet created:', createData);

  // Test 2: Get wallet
  console.log('\n2. Getting wallet...');
  const { data: getData, error: getError } = await supabase.functions.invoke('get-wallet', {
    body: { userAddress: testAddress },
  });

  if (getError) {
    console.error('❌ Get failed:', getError);
    return;
  }
  console.log('✅ Wallet retrieved:', getData);

  // Test 3: Verify in database
  console.log('\n3. Verifying in database...');
  const { data: dbData, error: dbError } = await supabase
    .from('server_wallets')
    .select('*')
    .eq('user_address', testAddress.toLowerCase())
    .single();

  if (dbError) {
    console.error('❌ Database query failed:', dbError);
    return;
  }
  console.log('✅ Database record:', dbData);

  console.log('\n🎉 All tests passed!');
}

testServerWallets().catch(console.error);
```

Run it:
```bash
npx tsx scripts/test-server-wallets.ts
```

## Common Issues & Solutions

### Issue: "Connection refused" when calling Edge Functions

**Solution**: Make sure `supabase functions serve` is running!

### Issue: "Missing CDP API credentials"

**Solution**: 
- Check `.env` file has `VITE_CDP_API_KEY` and `VITE_CDP_API_SECRET`
- Or set secrets: `supabase secrets set CDP_API_KEY_NAME=...`

### Issue: "Table server_wallets does not exist"

**Solution**: Run `supabase db push` to apply migrations

### Issue: Edge Function returns CORS error

**Solution**: CORS headers are already included, but check:
- Using correct URL (http://localhost:54321)
- Including Authorization header
- Content-Type header is set

### Issue: Wallet creation succeeds but transaction fails

**Solution**: 
- Make sure server wallet has balance (fund it with test ETH)
- Verify network_id matches (base-sepolia for testnet)
- Check transaction parameters are valid

## Testing Checklist

- [ ] Supabase running locally (`supabase start`)
- [ ] Database migration applied (`supabase db push`)
- [ ] Edge Functions serving (`supabase functions serve`)
- [ ] Environment variables set (`.env` file)
- [ ] Can create wallet via curl
- [ ] Can get wallet via curl
- [ ] Frontend connects to local Supabase
- [ ] `useServerWallet` hook works in browser
- [ ] Wallet appears in Supabase Studio
- [ ] Can send transaction (if wallet funded)

## Next Steps After Local Testing

1. **Test with real CDP credentials** (if available)
2. **Fund a test server wallet** with Base Sepolia ETH
3. **Test actual transactions** on testnet
4. **Deploy to Supabase** when ready
5. **Test in production** environment

## Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Edge Functions Local Development](https://supabase.com/docs/guides/functions/local-development)
- [CDP Testnet Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) (for Base Sepolia ETH)

