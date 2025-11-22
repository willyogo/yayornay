# Wallet Data Encryption Setup Guide

## Overview

This guide explains how to encrypt `wallet_data` before storing it in the database. Encryption ensures that even if the database is compromised, wallet data remains secure.

## How It Works

### Encryption Flow

```
1. Wallet created via CDP SDK
   ↓
2. Wallet data exported (JSON)
   ↓
3. Data encrypted using AES-GCM-256
   ↓
4. Encrypted data stored in database
```

### Decryption Flow

```
1. Encrypted data retrieved from database
   ↓
2. Data decrypted using same encryption key
   ↓
3. Decrypted JSON parsed to object
   ↓
4. Wallet imported from decrypted data
```

## Implementation

### 1. Encryption Utility

The encryption utilities are located in `supabase/functions/_shared/crypto.ts`:

- **`encryptWalletData()`**: Encrypts wallet data using AES-GCM-256
- **`decryptWalletData()`**: Decrypts wallet data
- **`generateEncryptionKey()`**: Generates a random encryption key
- **`getEncryptionKey()`**: Retrieves encryption key from environment

### 2. Encryption Algorithm

**AES-GCM-256** (Advanced Encryption Standard - Galois/Counter Mode):
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) - randomly generated for each encryption
- **Mode**: GCM (authenticated encryption)
- **Encoding**: Base64 for storage

**Why AES-GCM?**
- Industry standard, secure encryption
- Authenticated encryption (detects tampering)
- Built into Deno's Web Crypto API
- Efficient and fast

### 3. Updated Edge Functions

#### `create-wallet` Function

```typescript
// Export wallet data
const walletData = await wallet.export()

// Encrypt before storing
const encryptionKey = getEncryptionKey()
const encryptedWalletData = await encryptWalletData(walletData, encryptionKey)

// Store encrypted data
await supabase.from('server_wallets').insert({
  wallet_data: encryptedWalletData, // ✅ Encrypted
  // ... other fields
})
```

#### `send-transaction` Function

```typescript
// Retrieve encrypted wallet data
const { data: walletRecord } = await supabase
  .from('server_wallets')
  .select('*')
  .eq('user_address', normalizedAddress)
  .single()

// Decrypt wallet data
const encryptionKey = getEncryptionKey()
const decryptedWalletDataString = await decryptWalletData(
  walletRecord.wallet_data,
  encryptionKey
)

// Parse JSON and import wallet
const decryptedWalletData = JSON.parse(decryptedWalletDataString)
const wallet = await Wallet.import(decryptedWalletData)
```

## Setup Instructions

### Step 1: Generate Encryption Key

**Option A: Using the utility function**

Create a temporary script to generate a key:

```typescript
// scripts/generate-encryption-key.ts
import { generateEncryptionKey } from '../supabase/functions/_shared/crypto.ts'

const key = generateEncryptionKey()
console.log('Generated encryption key:')
console.log(key)
console.log('\nAdd this to your .env file as:')
console.log(`WALLET_ENCRYPTION_KEY=${key}`)
```

**Option B: Using OpenSSL**

```bash
# Generate 32 random bytes and encode as base64
openssl rand -base64 32
```

**Option C: Using Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 2: Store Encryption Key Securely

#### Local Development

Add to `.env` or `.env.local`:

```env
WALLET_ENCRYPTION_KEY=your-generated-base64-key-here
```

**⚠️ Important**: Never commit the encryption key to git!

#### Production (Supabase)

**Option 1: Environment Variables**

Set via Supabase CLI:

```bash
supabase secrets set WALLET_ENCRYPTION_KEY=your-generated-base64-key-here
```

**Option 2: Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add `WALLET_ENCRYPTION_KEY` with your generated key

**Option 3: Supabase Vault (Recommended for Production)**

For production, consider using Supabase Vault for key management:

```typescript
// In Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const { data: vaultData } = await supabase.vault.get('wallet-encryption-key')
const encryptionKey = vaultData.value
```

### Step 3: Update Edge Functions

The Edge Functions have been updated to use encryption:

- ✅ `create-wallet`: Encrypts before storing
- ✅ `send-transaction`: Decrypts before importing

No additional changes needed if you've updated the code.

### Step 4: Migrate Existing Data (If Needed)

If you have existing unencrypted wallet data, you'll need to migrate it:

```typescript
// Migration script (run once)
import { createClient } from '@supabase/supabase-js'
import { encryptWalletData, getEncryptionKey } from './supabase/functions/_shared/crypto.ts'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const encryptionKey = getEncryptionKey()

// Get all unencrypted wallets
const { data: wallets } = await supabase
  .from('server_wallets')
  .select('*')

// Encrypt each wallet
for (const wallet of wallets) {
  // Check if already encrypted (encrypted data is base64 string)
  if (typeof wallet.wallet_data === 'string' && wallet.wallet_data.length > 100) {
    // Likely already encrypted, skip
    continue
  }
  
  // Encrypt wallet data
  const encrypted = await encryptWalletData(wallet.wallet_data, encryptionKey)
  
  // Update database
  await supabase
    .from('server_wallets')
    .update({ wallet_data: encrypted })
    .eq('id', wallet.id)
}
```

## Security Best Practices

### 1. **Key Management**

- ✅ Store encryption key in environment variables (never in code)
- ✅ Use different keys for development and production
- ✅ Rotate keys periodically (requires re-encrypting all wallets)
- ✅ Use Supabase Vault for production key storage
- ❌ Never commit encryption keys to git
- ❌ Never expose keys in client-side code
- ❌ Never log encryption keys

### 2. **Key Rotation**

If you need to rotate encryption keys:

1. Generate new encryption key
2. Decrypt all wallets with old key
3. Re-encrypt with new key
4. Update `WALLET_ENCRYPTION_KEY` environment variable
5. Test thoroughly before deploying

### 3. **Backup Strategy**

- Backup encryption keys securely (password manager, secure vault)
- Store backups separately from database backups
- Document key rotation procedures

### 4. **Monitoring**

- Monitor for decryption failures (may indicate key mismatch)
- Log encryption/decryption operations (without logging keys)
- Set up alerts for encryption errors

## Troubleshooting

### Error: "Failed to decrypt wallet data"

**Possible Causes**:
1. Encryption key mismatch (wrong key or not set)
2. Data corrupted in database
3. Data was never encrypted (old records)

**Solution**:
- Verify `WALLET_ENCRYPTION_KEY` is set correctly
- Check if wallet data is actually encrypted (should be base64 string)
- For old unencrypted data, run migration script

### Error: "Invalid key length"

**Cause**: Encryption key is not 32 bytes (256 bits)

**Solution**:
- Regenerate key using one of the methods above
- Ensure key is base64 encoded 32-byte key

### Error: "Data is not encrypted"

**Cause**: Trying to decrypt data that was never encrypted

**Solution**:
- Check if wallet was created before encryption was enabled
- Run migration script to encrypt existing data

## Testing

### Test Encryption/Decryption

```typescript
import { encryptWalletData, decryptWalletData, generateEncryptionKey } from './crypto.ts'

// Generate test key
const key = generateEncryptionKey()

// Test data
const testData = { walletId: 'test-123', address: '0x...' }

// Encrypt
const encrypted = await encryptWalletData(testData, key)
console.log('Encrypted:', encrypted)

// Decrypt
const decrypted = await decryptWalletData(encrypted, key)
console.log('Decrypted:', JSON.parse(decrypted))

// Verify
console.log('Match:', JSON.stringify(testData) === decrypted)
```

### Test with Real Wallet

```bash
# 1. Set encryption key in .env
echo "WALLET_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env

# 2. Start Edge Functions
supabase functions serve --env-file .env

# 3. Create a wallet (should be encrypted)
./test-wallet-simple.sh

# 4. Check database - wallet_data should be base64 string
supabase db psql
SELECT wallet_data FROM server_wallets LIMIT 1;
```

## Summary

✅ **Encryption is enabled** by default in the updated Edge Functions
✅ **AES-GCM-256** encryption algorithm (secure and standard)
✅ **Automatic encryption** on wallet creation
✅ **Automatic decryption** on wallet import
✅ **Key stored securely** in environment variables

**Next Steps**:
1. Generate encryption key
2. Add to `.env` for local development
3. Set as Supabase secret for production
4. Test wallet creation and transactions
5. Migrate existing data if needed

## Additional Resources

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)

