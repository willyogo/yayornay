# Quick Test: Wallet Creation

## The Simplest Way

### Step 1: Make sure Supabase is running
```bash
supabase start
```

### Step 2: Restart Edge Functions (to pick up env vars)
```bash
# Stop current serve (Ctrl+C), then:
supabase functions serve
```

**Important**: Edge Functions need to be restarted after setting environment variables.

### Step 3: Run the test
```bash
./test-wallet-simple.sh
```

## Alternative: Set secrets manually

If Edge Functions aren't picking up `.env.local`, you can set them as secrets:

```bash
# Load from .env.local and set secrets
export $(cat .env.local | grep -v '^#' | xargs)
supabase secrets set VITE_CDP_API_KEY="$VITE_CDP_API_KEY"
supabase secrets set VITE_CDP_API_SECRET="$VITE_CDP_API_SECRET"
supabase secrets set VITE_SUPABASE_URL="$VITE_SUPABASE_URL"
supabase secrets set VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
```

But for local dev, restarting `supabase functions serve` should pick up `.env.local` automatically.

## Check if it's working

The test script will show:
- ✅ Success: `{"serverWalletAddress": "0x...", "walletId": "...", "message": "Wallet created successfully"}`
- ❌ Error: Shows what's missing (credentials, database, etc.)

