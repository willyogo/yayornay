# Quick Test: Wallet Creation

## The Simplest Way

### Step 1: Make sure Supabase is running
```bash
supabase start
```

### Step 2: Serve Edge Functions (with env file)
```bash
supabase functions serve --env-file .env
```

**Note**: Use `--env-file .env` or `--env-file .env.local` to ensure Edge Functions can access CDP credentials.

### Step 3: Run the test
```bash
./test-wallet-simple.sh
```

Or use the comprehensive test script:
```bash
npx tsx scripts/test-server-wallets.ts
```

## Prerequisites Checklist

- [ ] Supabase running: `supabase start`
- [ ] Edge Functions serving: `supabase functions serve --env-file .env`
- [ ] Database migration applied: `supabase db reset` (or migrations auto-applied)
- [ ] `.env` or `.env.local` file has:
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
- Restart Edge Functions with `--env-file .env` flag

**Error: "Table server_wallets does not exist"**
- Run: `supabase db reset` to apply migrations

**Error: "Edge Function returned 500"**
- Check Edge Functions are serving: `supabase functions serve --env-file .env`
- Check Edge Function logs for details

**Error: "Connection refused"**
- Make sure Supabase is running: `supabase start`
