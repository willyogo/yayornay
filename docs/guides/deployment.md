# Server Wallets Deployment Guide

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **CDP API Credentials**:
   - API Key Name
   - API Key Private Key

3. **Supabase Project**:
   - Project URL
   - Anon Key

## Step 1: Database Migration

Apply the database migration to create the `server_wallets` table:

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

Or manually run the migration in Supabase Dashboard:
1. Go to SQL Editor
2. Run `supabase/migrations/20250122000000_create_server_wallets_table.sql`

## Step 2: Set Environment Variables

Set Edge Function secrets in Supabase Dashboard:

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:
   - `VITE_CDP_API_KEY` = Your CDP API key name
   - `VITE_CDP_API_SECRET` = Your CDP API key private key
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

**Note**: Edge Functions can access environment variables from your `.env` file when running locally with Supabase CLI. For production, set these as secrets in the Supabase Dashboard.

## Step 3: Deploy Edge Functions

Deploy all three Edge Functions:

```bash
# Deploy create-wallet function
supabase functions deploy create-wallet

# Deploy get-wallet function
supabase functions deploy get-wallet

# Deploy send-transaction function
supabase functions deploy send-transaction
```

## Step 4: Verify Deployment

Test the functions using curl or your frontend:

```bash
# Test create-wallet
curl -X POST https://your-project-ref.supabase.co/functions/v1/create-wallet \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0xYourAddress"}'

# Test get-wallet
curl -X GET "https://your-project-ref.supabase.co/functions/v1/get-wallet?userAddress=0xYourAddress" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Step 5: Update Frontend

The frontend hooks are already set up. The `useServerWallet()` hook will automatically:
1. Check if a server wallet exists for the connected user
2. Create one if it doesn't exist
3. Return the server wallet address

## Local Development

To test Edge Functions locally:

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Functions will be available at:
# http://localhost:54321/functions/v1/create-wallet
# http://localhost:54321/functions/v1/get-wallet
# http://localhost:54321/functions/v1/send-transaction
```

## Troubleshooting

### Function Deployment Fails

1. **Check Supabase CLI version**:
   ```bash
   supabase --version
   ```

2. **Verify project link**:
   ```bash
   supabase projects list
   ```

3. **Check function logs**:
   ```bash
   supabase functions logs create-wallet
   ```

### Wallet Creation Fails

1. **Check CDP credentials** are set correctly in Supabase secrets
2. **Verify database migration** was applied successfully
3. **Check Edge Function logs** in Supabase Dashboard

### Transaction Fails

1. **Ensure server wallet has balance** (fund the wallet address)
2. **Verify network_id** matches (base-sepolia for testnet)
3. **Check transaction parameters** are valid

## Security Checklist

Before going to production:

- [ ] Encrypt `wallet_data` before storing in database
- [ ] Use Coinbase-Managed (2-of-2 MPC) wallets
- [ ] Enable JWT verification on Edge Functions
- [ ] Implement rate limiting
- [ ] Set up IP whitelisting in CDP portal
- [ ] Rotate API keys regularly
- [ ] Monitor wallet activity

## Next Steps

1. Test wallet creation with a test address
2. Fund a server wallet and test transactions
3. Integrate server wallets into your voting flow
4. Implement gasless voting using server wallets

