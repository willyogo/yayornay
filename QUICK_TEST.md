# Quick Test: Wallet Generation

## Simplest Way to Test

### Option 1: Use the Test Script (Easiest)

```bash
# 1. Make sure Supabase is running
supabase start

# 2. Serve Edge Functions (in a separate terminal)
supabase functions serve

# 3. Run the test script
npx tsx scripts/test-create-wallet.ts
```

Or with a custom address:
```bash
npx tsx scripts/test-create-wallet.ts 0xYourAddressHere
```

### Option 2: Direct curl (Fastest)

```bash
# Get your anon key from: supabase start
ANON_KEY="your-anon-key-here"

curl -X POST http://localhost:54321/functions/v1/create-wallet \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### Option 3: Using the Existing Test Script

```bash
pnpm test:server-wallets
```

## Prerequisites Checklist

- [ ] Supabase running: `supabase start`
- [ ] Edge Functions serving: `supabase functions serve` (separate terminal)
- [ ] Database migration applied: `supabase db push`
- [ ] `.env` file has:
  - `VITE_SUPABASE_URL=http://localhost:54321`
  - `VITE_SUPABASE_ANON_KEY=<from supabase start>`
  - `VITE_CDP_API_KEY=<your-cdp-key>`
  - `VITE_CDP_API_SECRET=<your-cdp-secret>`

## Expected Output

If successful, you should see:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "...",
  "message": "Wallet created successfully"
}
```

## Troubleshooting

**Error: "Missing CDP API credentials"**
- Check `.env` file has `VITE_CDP_API_KEY` and `VITE_CDP_API_SECRET`

**Error: "Table server_wallets does not exist"**
- Run: `supabase db push`

**Error: "Edge Function returned 500"**
- Check Edge Functions are serving: `supabase functions serve`
- Check Edge Function logs for details

**Error: "Connection refused"**
- Make sure Supabase is running: `supabase start`

