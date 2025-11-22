# Checking and Creating Server Wallets

This guide shows you the best ways to create and verify that server wallets exist for your users.

## Creating Wallets

### Quick Script (Easiest) ⭐

```bash
# Create wallet for a single address
./scripts/create-wallet.sh 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Create wallets for multiple addresses
./scripts/create-wallet.sh 0xAddress1 0xAddress2 0xAddress3
```

The script will:
- ✅ Create wallets via the Edge Function
- ✅ Handle existing wallets gracefully
- ✅ Show wallet addresses and IDs
- ✅ Provide a summary of results

### Via Edge Function

```bash
curl -X POST http://localhost:54321/functions/v1/create-wallet \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Response**:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "wallet-id-123",
  "message": "Wallet created successfully"
}
```

---

## Checking Wallets

### 1. **Via Edge Function (Recommended)** ⭐

The `get-wallet` Edge Function is the cleanest way to check wallet existence:

```bash
# Using curl
curl -X POST http://localhost:54321/functions/v1/get-wallet \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

**Response (wallet exists)**:
```json
{
  "serverWalletAddress": "0x...",
  "walletId": "wallet-id-123",
  "networkId": "base-sepolia",
  "createdAt": "2025-01-22T12:00:00Z"
}
```

**Response (wallet not found)**:
```json
{
  "error": "Server wallet not found for user"
}
```

### 2. **Using the Check Script** 🚀

Use the provided script for quick checks:

```bash
# Check specific addresses
./scripts/check-wallets.sh 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Check all wallets in database
./scripts/check-wallets.sh
```

### 3. **Direct Database Query**

Query the `server_wallets` table directly:

```typescript
import { supabase } from './lib/supabase';

// Check if wallet exists for a user
const { data, error } = await supabase
  .from('server_wallets')
  .select('server_wallet_address, server_wallet_id, network_id, created_at')
  .eq('user_address', userAddress.toLowerCase())
  .single();

if (error || !data) {
  console.log('Wallet not found');
} else {
  console.log('Wallet exists:', data);
}
```

### 4. **Using React Hook**

In your React components, use the `useServerWallet` hook:

```typescript
import { useServerWallet } from './hooks/useServerWallet';

function MyComponent() {
  const { serverWalletAddress, loading, error } = useServerWallet();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!serverWalletAddress) return <div>No wallet found</div>;
  
  return <div>Server Wallet: {serverWalletAddress}</div>;
}
```

### 5. **Via Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **server_wallets**
3. View all wallets or filter by `user_address`

---

## Methods Comparison

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Edge Function** | API calls, scripts | ✅ Clean API<br>✅ Returns formatted data<br>✅ Handles errors | Requires HTTP call |
| **Check Script** | Quick verification | ✅ Easy to use<br>✅ Handles multiple addresses<br>✅ Shows all wallets | Requires bash |
| **Database Query** | Frontend/backend code | ✅ Direct access<br>✅ Fast<br>✅ Flexible queries | Requires Supabase client |
| **React Hook** | Frontend components | ✅ Automatic updates<br>✅ Loading states<br>✅ Error handling | React-specific |
| **Supabase Dashboard** | Visual inspection | ✅ No code needed<br>✅ Easy filtering | Manual process |

---

## Production vs Local

### Local Development

```bash
# Local Supabase instance
SUPABASE_URL=http://localhost:54321
```

### Production

```bash
# Production Supabase instance
SUPABASE_URL=https://your-project-ref.supabase.co
```

**Note**: For production, use your production anon key and project URL.

---

## Advanced Queries

### Count All Wallets

```sql
SELECT COUNT(*) FROM server_wallets;
```

### List All Wallets

```sql
SELECT 
  user_address,
  server_wallet_address,
  network_id,
  created_at
FROM server_wallets
ORDER BY created_at DESC;
```

### Find Wallets by Network

```sql
SELECT * FROM server_wallets
WHERE network_id = 'base-sepolia';
```

### Check Wallet Balance (via CDP SDK)

```typescript
// In an Edge Function or backend
import { Wallet } from 'npm:@coinbase/coinbase-sdk@latest';

const wallet = await Wallet.import(walletData);
const address = await wallet.getDefaultAddress();
const balance = await wallet.getBalance(address);
```

---

## Troubleshooting

### Wallet Not Found

**Possible causes**:
1. Wallet was never created for this user
2. User address is incorrect (check case sensitivity)
3. Database connection issue

**Solution**:
- Verify user address is correct
- Check database directly
- Try creating wallet again

### Edge Function Returns 404

**Possible causes**:
1. Edge Function not deployed
2. Wrong endpoint URL
3. Missing authentication

**Solution**:
- Verify Edge Function is running: `supabase functions serve`
- Check endpoint URL matches your setup
- Ensure `Authorization` header is included

### Database Query Returns Empty

**Possible causes**:
1. RLS policies blocking access
2. Wrong table name
3. Address not normalized

**Solution**:
- Check RLS policies allow read access
- Verify table name: `server_wallets`
- Normalize address to lowercase

---

## Best Practices

1. **Use Edge Function** for API-based checks (most reliable)
2. **Normalize addresses** to lowercase before querying
3. **Handle errors gracefully** - wallet might not exist yet
4. **Cache results** if checking frequently
5. **Log wallet creation** for debugging

---

## Quick Reference

```bash
# Create wallet
./scripts/create-wallet.sh 0xYourAddress

# Check single wallet
./scripts/check-wallets.sh 0xYourAddress

# Check all wallets
./scripts/check-wallets.sh

# Via Edge Function (curl)
curl -X POST http://localhost:54321/functions/v1/get-wallet \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0xYourAddress"}'

# Via Edge Function (JavaScript)
const { data } = await supabase.functions.invoke('get-wallet', {
  body: { userAddress: '0xYourAddress' }
});
```

---

## Summary

### Creating Wallets
✅ **Best method**: Use `./scripts/create-wallet.sh`  
✅ **Via API**: Call `create-wallet` Edge Function  
✅ **In code**: Use `useServerWallet` hook (auto-creates if needed)  

### Checking Wallets
✅ **Best method**: Use the `get-wallet` Edge Function  
✅ **Quickest**: Use `./scripts/check-wallets.sh`  
✅ **In code**: Use `useServerWallet` hook or direct database query  
✅ **Visual**: Check Supabase Dashboard  

The Edge Function approach is recommended because it:
- Provides a clean API
- Handles errors properly
- Returns formatted data
- Works the same in local and production

