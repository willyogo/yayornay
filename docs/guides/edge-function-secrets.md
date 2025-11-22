# Edge Function Secrets Reference

## Required Secrets by Function

### `create-wallet` Function

**Required Secrets**:
- ✅ `VITE_CDP_API_KEY` - CDP API key name
- ✅ `VITE_CDP_API_SECRET` - CDP API key private key
- ✅ `WALLET_ENCRYPTION_KEY` - Encryption key for wallet data
- ⚠️ `VITE_SUPABASE_URL` or `SUPABASE_URL` - Supabase project URL (optional, auto-provided)
- ⚠️ `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` - Supabase anon key (optional, auto-provided)

**What it does**: Creates wallets, encrypts wallet data, stores in database

---

### `get-wallet` Function

**Required Secrets**:
- ❌ `VITE_CDP_API_KEY` - **NOT NEEDED**
- ❌ `VITE_CDP_API_SECRET` - **NOT NEEDED**
- ❌ `WALLET_ENCRYPTION_KEY` - **NOT NEEDED**
- ⚠️ `VITE_SUPABASE_URL` or `SUPABASE_URL` - Supabase project URL (optional, auto-provided)
- ⚠️ `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` - Supabase anon key (optional, auto-provided)

**What it does**: Only reads public wallet info from database (no CDP SDK, no encryption)

---

### `send-transaction` Function

**Required Secrets**:
- ✅ `VITE_CDP_API_KEY` - CDP API key name
- ✅ `VITE_CDP_API_SECRET` - CDP API key private key
- ✅ `WALLET_ENCRYPTION_KEY` - Encryption key for wallet data
- ⚠️ `VITE_SUPABASE_URL` or `SUPABASE_URL` - Supabase project URL (optional, auto-provided)
- ⚠️ `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` - Supabase anon key (optional, auto-provided)

**What it does**: Decrypts wallet, signs transactions, broadcasts to blockchain

---

## Summary: Minimum Required Secrets

### For All Functions to Work:

```bash
# Required for create-wallet and send-transaction
supabase secrets set VITE_CDP_API_KEY=your-key
supabase secrets set VITE_CDP_API_SECRET=your-secret
supabase secrets set WALLET_ENCRYPTION_KEY=your-encryption-key

# Optional - Supabase auto-provides these, but you can set explicitly
supabase secrets set VITE_SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Minimum Set (Functions will work):

```bash
# Only these 3 are actually required
supabase secrets set VITE_CDP_API_KEY=your-key
supabase secrets set VITE_CDP_API_SECRET=your-secret
supabase secrets set WALLET_ENCRYPTION_KEY=your-encryption-key
```

**Why**: Supabase Edge Functions automatically have access to:
- `SUPABASE_URL` - Built-in environment variable
- `SUPABASE_ANON_KEY` - Built-in environment variable

So you don't need to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unless you want to override the defaults.

---

## Function-by-Function Breakdown

| Secret | create-wallet | get-wallet | send-transaction |
|--------|---------------|------------|------------------|
| `VITE_CDP_API_KEY` | ✅ Required | ❌ Not needed | ✅ Required |
| `VITE_CDP_API_SECRET` | ✅ Required | ❌ Not needed | ✅ Required |
| `WALLET_ENCRYPTION_KEY` | ✅ Required | ❌ Not needed | ✅ Required |
| `VITE_SUPABASE_URL` | ⚠️ Optional* | ⚠️ Optional* | ⚠️ Optional* |
| `VITE_SUPABASE_ANON_KEY` | ⚠️ Optional* | ⚠️ Optional* | ⚠️ Optional* |

\* Auto-provided by Supabase, but can be set explicitly

---

## Quick Answer

**You only need 3 secrets**:

1. `VITE_CDP_API_KEY` - For creating wallets and sending transactions
2. `VITE_CDP_API_SECRET` - For creating wallets and sending transactions  
3. `WALLET_ENCRYPTION_KEY` - For encrypting/decrypting wallet data

The Supabase URL and anon key are automatically available to Edge Functions, so you don't need to set them unless you want to override the defaults.

---

## Production Setup

```bash
# Generate encryption key
npx tsx scripts/generate-encryption-key.ts

# Set required secrets
supabase secrets set VITE_CDP_API_KEY=your-production-cdp-key
supabase secrets set VITE_CDP_API_SECRET=your-production-cdp-secret
supabase secrets set WALLET_ENCRYPTION_KEY=your-generated-key

# Optional: Set Supabase credentials explicitly (if needed)
supabase secrets set VITE_SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Verification

Check which secrets are set:

```bash
supabase secrets list
```

Test each function:

```bash
# Test create-wallet (needs CDP keys + encryption key)
curl -X POST https://your-project.supabase.co/functions/v1/create-wallet \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x..."}'

# Test get-wallet (only needs Supabase, which is auto-provided)
curl -X GET "https://your-project.supabase.co/functions/v1/get-wallet?userAddress=0x..." \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test send-transaction (needs CDP keys + encryption key)
curl -X POST https://your-project.supabase.co/functions/v1/send-transaction \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x...", "to": "0x...", "amount": "1000000000000000000", "currency": "ETH"}'
```

