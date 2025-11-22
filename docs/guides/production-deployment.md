# Production Deployment Guide: Server Wallets System

Complete step-by-step guide to deploy the server wallets system to production on Supabase.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Supabase Account** ([sign up](https://supabase.com))
- ✅ **Supabase CLI** installed (`npm install -g supabase`)
- ✅ **CDP API Credentials** (API Key Name + Private Key)
- ✅ **Node.js 18+** installed
- ✅ **Git** repository with your code

---

## Step 1: Create/Link Supabase Project

### Option A: Create New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name**: Your project name
   - **Database Password**: Strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Select appropriate plan
4. Wait for project to initialize (~2 minutes)

### Option B: Link Existing Project

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

**Find your project ref**: Dashboard → Settings → General → Reference ID

---

## Step 2: Configure Project Reference

Update `supabase/config.toml`:

```toml
[project]
project_id = "your-project-ref"  # Add this line
```

Or set it via environment variable:

```bash
export SUPABASE_PROJECT_REF=your-project-ref
```

---

## Step 3: Deploy Database Migrations

### 3.1 Push All Migrations

```bash
# Make sure you're linked
supabase link --project-ref your-project-ref

# Push all migrations to production
supabase db push
```

This will apply:
- `20250122000000_create_server_wallets_table.sql`
- `20250122000001_fix_server_wallets_rls.sql`

### 3.2 Verify Migration

Check in Supabase Dashboard:
1. Go to **Database** → **Tables**
2. Verify `server_wallets` table exists
3. Check indexes and RLS policies are applied

Or via SQL:

```sql
-- Check table exists
SELECT * FROM server_wallets LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'server_wallets';
```

---

## Step 4: Generate and Set Secrets

### 4.1 Generate Encryption Key

```bash
# Generate encryption key
npx tsx scripts/generate-encryption-key.ts
```

Save the generated key securely.

### 4.2 Set All Secrets

**Option A: Via Supabase CLI** (Recommended)

```bash
# Set CDP API credentials
supabase secrets set VITE_CDP_API_KEY=your-cdp-api-key-name
supabase secrets set VITE_CDP_API_SECRET=your-cdp-api-key-private-key

# Set Supabase credentials (get from Dashboard → Settings → API)
supabase secrets set VITE_SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=your-anon-key

# Set encryption key
supabase secrets set WALLET_ENCRYPTION_KEY=your-generated-encryption-key

# Verify secrets are set
supabase secrets list
```

**Option B: Via Supabase Dashboard**

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add each secret:
   - `VITE_CDP_API_KEY` = Your CDP API key name
   - `VITE_CDP_API_SECRET` = Your CDP API key private key
   - `VITE_SUPABASE_URL` = `https://your-project-ref.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = Your anon key (from Settings → API)
   - `WALLET_ENCRYPTION_KEY` = Generated encryption key

**Get Supabase Credentials**:
- **URL**: Dashboard → Settings → API → Project URL
- **Anon Key**: Dashboard → Settings → API → Project API keys → `anon` `public`

---

## Step 5: Configure Production Settings

### 5.1 Update Edge Function Config

Edit `supabase/config.toml`:

```toml
[functions.create-wallet]
verify_jwt = true  # Enable JWT verification for production

[functions.get-wallet]
verify_jwt = true

[functions.send-transaction]
verify_jwt = true
```

**Note**: JWT verification requires authenticated requests. For public access, keep `verify_jwt = false` but implement your own authentication.

### 5.2 Switch to Coinbase-Managed Wallets (Production)

Edit `supabase/functions/create-wallet/index.ts`:

```typescript
// Change from Developer-Managed to Coinbase-Managed (2-of-2 MPC)
const wallet = await Wallet.create({
  networkId: 'base-sepolia',  // or 'base-mainnet' for production
  walletConfig: {
    type: 'COINBASE_MANAGED',  // Enable MPC security
  },
})
```

**Benefits**:
- Enhanced security (2-of-2 MPC)
- Coinbase manages one key share
- Even if your key is compromised, wallets are safe

### 5.3 Update Network (If Using Mainnet)

For Base Mainnet, change:

```typescript
networkId: 'base-mainnet'  // Instead of 'base-sepolia'
```

And update the migration default:

```sql
network_id text DEFAULT 'base-mainnet',  -- Update default
```

---

## Step 6: Deploy Edge Functions

### 6.1 Deploy All Functions

```bash
# Deploy create-wallet
supabase functions deploy create-wallet

# Deploy get-wallet
supabase functions deploy get-wallet

# Deploy send-transaction
supabase functions deploy send-transaction
```

### 6.2 Deploy with Specific Project

If not linked, specify project:

```bash
supabase functions deploy create-wallet --project-ref your-project-ref
```

### 6.3 Verify Deployment

Check function URLs:
- `https://your-project-ref.supabase.co/functions/v1/create-wallet`
- `https://your-project-ref.supabase.co/functions/v1/get-wallet`
- `https://your-project-ref.supabase.co/functions/v1/send-transaction`

---

## Step 7: Test Production Deployment

### 7.1 Test Wallet Creation

```bash
# Get your anon key from Supabase Dashboard
ANON_KEY="your-anon-key"
PROJECT_REF="your-project-ref"

# Test create-wallet
curl -X POST https://${PROJECT_REF}.supabase.co/functions/v1/create-wallet \
  -H "Authorization: Bearer ${ANON_KEY}" \
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

### 7.2 Test Get Wallet

```bash
curl -X GET "https://${PROJECT_REF}.supabase.co/functions/v1/get-wallet?userAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "Authorization: Bearer ${ANON_KEY}"
```

### 7.3 Check Function Logs

```bash
# View logs for create-wallet
supabase functions logs create-wallet

# View logs for all functions
supabase functions logs
```

Or in Dashboard: **Edge Functions** → Select function → **Logs**

---

## Step 8: Update Frontend Configuration

### 8.1 Update Environment Variables

Create `.env.production`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: CDP API keys should NOT be in frontend `.env` - they're only in Edge Functions.

### 8.2 Update Supabase Client

Ensure `src/lib/supabase.ts` uses production URL:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
  'https://your-project-ref.supabase.co'
```

### 8.3 Build and Deploy Frontend

```bash
# Build for production
npm run build
# or
pnpm build

# Deploy to your hosting (Vercel, Netlify, etc.)
# Your hosting platform will use .env.production
```

---

## Step 9: Production Security Checklist

Before going live, verify:

### ✅ Secrets Management
- [ ] All secrets set in Supabase (not in code)
- [ ] Encryption key generated and stored securely
- [ ] CDP API keys are production keys (not test keys)
- [ ] No secrets committed to git

### ✅ Database Security
- [ ] RLS policies enabled and tested
- [ ] `wallet_data` column never exposed via RLS
- [ ] Database backups enabled
- [ ] Connection pooling configured (if needed)

### ✅ Edge Functions Security
- [ ] JWT verification enabled (if using auth)
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (via Supabase or CDN)
- [ ] Error messages don't expose sensitive info

### ✅ Wallet Security
- [ ] Coinbase-Managed (2-of-2 MPC) wallets enabled
- [ ] Wallet data encrypted before storage
- [ ] Encryption key rotated periodically
- [ ] Network set to mainnet (if production)

### ✅ Monitoring
- [ ] Function logs monitored
- [ ] Error alerts configured
- [ ] Wallet creation/transaction monitoring
- [ ] Database performance monitored

---

## Step 10: Monitoring and Maintenance

### 10.1 Set Up Monitoring

**Supabase Dashboard**:
- **Edge Functions** → View logs and metrics
- **Database** → Monitor query performance
- **Logs** → Set up alerts for errors

**CDP Dashboard**:
- Monitor wallet creation
- Track transaction volume
- Set up alerts for unusual activity

### 10.2 Regular Maintenance

**Weekly**:
- Review function logs for errors
- Check wallet creation success rate
- Monitor database performance

**Monthly**:
- Review and rotate encryption keys (if needed)
- Audit RLS policies
- Review CDP API key usage
- Check for Supabase updates

**Quarterly**:
- Security audit
- Performance optimization
- Cost review (Supabase + CDP)

---

## Troubleshooting

### Function Deployment Fails

**Error**: "Function failed to deploy"

**Solutions**:
1. Check Supabase CLI version: `supabase --version` (update if needed)
2. Verify project link: `supabase projects list`
3. Check function syntax: `supabase functions serve` locally first
4. Review logs: `supabase functions logs <function-name>`

### Missing Secrets Error

**Error**: "Missing CDP API credentials"

**Solutions**:
1. Verify secrets are set: `supabase secrets list`
2. Check secret names match exactly (case-sensitive)
3. Redeploy function after setting secrets
4. Check Dashboard → Edge Functions → Secrets

### Database Migration Fails

**Error**: "Migration failed"

**Solutions**:
1. Check if table already exists: `SELECT * FROM server_wallets LIMIT 1`
2. Review migration SQL for syntax errors
3. Check database permissions
4. Try manual migration via SQL Editor

### Wallet Creation Fails

**Error**: "Failed to create wallet"

**Solutions**:
1. Check CDP API credentials are correct
2. Verify CDP API key has wallet creation permissions
3. Check function logs for detailed error
4. Test CDP API key directly with CDP SDK

### Transaction Fails

**Error**: "Failed to send transaction"

**Solutions**:
1. Ensure server wallet has sufficient balance
2. Verify network_id matches (mainnet vs testnet)
3. Check transaction parameters are valid
4. Review CDP transaction limits/quota

---

## Production URLs

After deployment, your functions will be available at:

```
https://your-project-ref.supabase.co/functions/v1/create-wallet
https://your-project-ref.supabase.co/functions/v1/get-wallet
https://your-project-ref.supabase.co/functions/v1/send-transaction
```

Replace `your-project-ref` with your actual project reference ID.

---

## Quick Reference Commands

```bash
# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Set secrets
supabase secrets set KEY=value

# Deploy functions
supabase functions deploy create-wallet
supabase functions deploy get-wallet
supabase functions deploy send-transaction

# View logs
supabase functions logs create-wallet

# List secrets
supabase secrets list

# Test locally
supabase functions serve --env-file .env
```

---

## Next Steps

After successful deployment:

1. **Test with real users**: Create wallets for test addresses
2. **Fund server wallets**: Send test ETH to server wallet addresses
3. **Test transactions**: Send test transactions
4. **Monitor performance**: Watch logs and metrics
5. **Integrate with app**: Connect frontend to production functions

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Edge Functions Guide**: https://supabase.com/docs/guides/functions
- **CDP Documentation**: https://docs.cdp.coinbase.com
- **Project Issues**: Check Supabase Dashboard → Support

---

## Summary

✅ **Project Created/Linked**  
✅ **Database Migrations Deployed**  
✅ **Secrets Configured**  
✅ **Edge Functions Deployed**  
✅ **Production Settings Configured**  
✅ **Frontend Updated**  
✅ **Security Checklist Complete**  
✅ **Monitoring Set Up**

Your server wallets system is now live in production! 🚀

