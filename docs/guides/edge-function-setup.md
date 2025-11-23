# Setting Up Edge Functions Locally

This guide explains how to run Supabase Edge Functions locally for development.

## Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```
   
   Or follow the [official installation guide](https://supabase.com/docs/guides/cli).

2. **Docker Desktop** (required for local Supabase):
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Make sure Docker is running

## Quick Start

### Option 1: Using the Script (Recommended)

```bash
./start-edge-functions.sh
```

This script will:
- Check if Supabase is running, start it if needed
- Load environment variables from `.env.local` or `.env`
- Start the Edge Functions server

### Option 2: Manual Setup

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Get your local Supabase credentials**:
   ```bash
   supabase status
   ```
   
   Copy the `anon key` and `URL` from the output.

3. **Create `.env.local` file** (if it doesn't exist):
   ```env
   # Supabase Configuration (from supabase status)
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your-anon-key-from-status

   # CDP API Configuration
   VITE_CDP_API_KEY=your-cdp-api-key-id
   VITE_CDP_API_SECRET=your-cdp-api-key-secret
   CDP_WALLET_SECRET=your-cdp-wallet-secret

   # CDP Network
   CDP_NETWORK_ID=base-sepolia
   ```

4. **Start Edge Functions**:
   ```bash
   supabase functions serve --env-file .env.local --no-verify-jwt
   ```

## Environment Variables

Edge Functions need these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Local Supabase URL | `http://localhost:54321` |
| `VITE_SUPABASE_ANON_KEY` | Anon key from `supabase status` | `eyJhbGc...` |
| `VITE_CDP_API_KEY` | CDP API Key ID | Your CDP API key name |
| `VITE_CDP_API_SECRET` | CDP API Key Secret | Your CDP API key secret |
| `CDP_WALLET_SECRET` | CDP Wallet Secret | Your CDP wallet secret (required) |
| `CDP_NETWORK_ID` | Network to use | `base-sepolia` or `base-mainnet` |

## Verifying Setup

1. **Check Supabase is running**:
   ```bash
   curl http://localhost:54321/health
   ```
   Should return: `{"status":"ok"}`

2. **Check Edge Functions are running**:
   ```bash
   curl http://localhost:54321/functions/v1/get-wallet
   ```
   Should return a CORS error (which is expected - means the function is running)

3. **Check in browser console**:
   - Open your app at `http://localhost:5173`
   - Open browser console (F12)
   - Navigate to Wallet tab
   - You should see logs like:
     ```
     [useServerWallet] Fetching wallet for address: 0x...
     [useServerWallet] get-wallet response: ...
     ```

## Troubleshooting

### "Failed to send a request to the Edge Function"

**Cause**: Edge Functions server is not running.

**Solution**:
1. Make sure Supabase is running: `supabase status`
2. Start Edge Functions: `supabase functions serve --env-file .env.local --no-verify-jwt`
3. Check the terminal for any errors

### "Missing CDP API credentials"

**Cause**: Environment variables not set correctly.

**Solution**:
1. Check `.env.local` file exists
2. Verify `VITE_CDP_API_KEY`, `VITE_CDP_API_SECRET`, and `CDP_WALLET_SECRET` are set
3. Restart the Edge Functions server after changing env vars

### "Failed to fetch" error

**Cause**: CORS or network issue.

**Solution**:
1. Make sure Edge Functions are running on `http://localhost:54321`
2. Check browser console for CORS errors
3. Verify `VITE_SUPABASE_URL` in your app matches the Edge Functions URL

### Edge Functions won't start

**Cause**: Supabase not initialized or Docker not running.

**Solution**:
1. Make sure Docker Desktop is running
2. Run `supabase start` first
3. Wait for Supabase to fully start (may take 1-2 minutes)
4. Then start Edge Functions

## Running Multiple Terminals

For development, you'll typically need two terminals:

**Terminal 1 - Frontend**:
```bash
npm run dev
```

**Terminal 2 - Edge Functions**:
```bash
npm run functions:dev
# or
./start-edge-functions.sh
```

## Stopping Services

**Stop Edge Functions**: Press `Ctrl+C` in the terminal running Edge Functions

**Stop Supabase**:
```bash
supabase stop
```

**Stop everything**:
```bash
supabase stop
# Then Ctrl+C in Edge Functions terminal
```

## Production Deployment

For production, Edge Functions are deployed to Supabase Cloud:

```bash
supabase functions deploy create-wallet
supabase functions deploy get-wallet
supabase functions deploy send-transaction
```

Set secrets in production:
```bash
supabase secrets set VITE_CDP_API_KEY=your-key
supabase secrets set VITE_CDP_API_SECRET=your-secret
supabase secrets set CDP_WALLET_SECRET=your-wallet-secret
```

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Local Development Setup](https://supabase.com/docs/guides/cli/local-development)

