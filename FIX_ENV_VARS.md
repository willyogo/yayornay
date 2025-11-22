# Fix: Edge Functions Missing Environment Variables

## Problem

Edge Functions return: `"Missing CDP API credentials: VITE_CDP_API_KEY, VITE_CDP_API_SECRET"`

## Root Cause

When running `supabase functions serve`, Edge Functions don't automatically read from `.env.local`. They need environment variables passed explicitly.

## Solution

### Option 1: Use --env-file flag (Recommended)

Stop your current `supabase functions serve` (Ctrl+C), then restart with:

```bash
supabase functions serve --env-file .env
```

Or if using `.env.local`:
```bash
supabase functions serve --env-file .env.local
```

### Option 2: Create .env file

Edge Functions automatically read from `.env` (not `.env.local`):

```bash
cp .env.local .env
# Then restart: supabase functions serve
```

### Option 3: Set secrets manually

```bash
export $(cat .env.local | grep -v '^#' | xargs)
supabase secrets set VITE_CDP_API_KEY="$VITE_CDP_API_KEY" --project-ref local
supabase secrets set VITE_CDP_API_SECRET="$VITE_CDP_API_SECRET" --project-ref local
```

## Verify It Works

After restarting with the env file, run:

```bash
./test-wallet-simple.sh
```

You should see:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "...",
  "message": "Wallet created successfully"
}
```

