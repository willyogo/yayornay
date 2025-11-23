# Server Wallet Migration Guide

## What Changed

Your app now uses **CDP Server Wallets** for truly gasless, instant voting with zero wallet confirmations. This gives users a seamless "Tinder experience" - just swipe to vote!

## Architecture Overview

### Before (Smart Wallet + Batch Voting)
1. User swipes → Vote queued locally
2. User clicks "Submit Batch" → Wallet popup
3. User confirms → Transaction submitted
4. Wait for confirmation

### After (Server Wallet + Custodial Signing)
1. User swipes → Vote submitted instantly
2. No wallet popup, no confirmation
3. Transaction signed by your CDP Server Wallet
4. User sees result immediately

## Key Files Modified

### 1. **src/hooks/useServerWallet.ts** (Enhanced)
- Added `sendTransaction()` method to call Edge Functions
- Auto-creates wallet when user connects
- Manages server wallet lifecycle

### 2. **src/hooks/useVoting.ts** (Updated)
- Now uses `useServerWallet` instead of `useSponsoredTransaction`
- Encodes function data with `encodeFunctionData` from viem
- Calls `sendTransaction` Edge Function for custodial signing
- No more `useWriteContracts` or wallet confirmations

### 3. **Edge Functions** (Already Built by Colleague)
- `create-wallet`: Creates CDP wallet for user
- `get-wallet`: Retrieves wallet info
- `send-transaction`: Signs transactions custodially

## Setup Instructions

### Step 1: Configure Environment Variables

#### For Local Development
1. Copy your CDP credentials:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your CDP credentials in `.env.local`:
   ```env
   VITE_CDP_API_KEY=your-api-key-id
   VITE_CDP_API_KEY_SECRET=your-api-key-secret
   VITE_CDP_WALLET_SECRET=your-wallet-secret
   ```

#### For Supabase Edge Functions
Set secrets in Supabase:
```bash
supabase secrets set CDP_API_KEY_ID=<your-key>
supabase secrets set CDP_API_KEY_SECRET=<your-secret>
supabase secrets set CDP_WALLET_SECRET=<your-wallet-secret>
```

Or use the Supabase dashboard:
1. Go to Project Settings → Edge Functions
2. Add secrets: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`

### Step 2: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy create-wallet
supabase functions deploy get-wallet
supabase functions deploy send-transaction
```

### Step 3: Test the Flow

1. Start dev server:
   ```bash
   pnpm dev
   ```

2. Connect wallet (any wallet - Smart Wallet, MetaMask, etc.)

3. Watch console logs:
   - Should see: `[useServerWallet] Fetching wallet for address: 0x...`
   - If no wallet: `[useServerWallet] Creating new wallet...`
   - Server wallet created automatically

4. Navigate to voting page and swipe on a proposal

5. Vote submits instantly without wallet popup!

## How It Works

### Wallet Initialization Flow
```
User connects wallet
    ↓
useServerWallet hook triggers
    ↓
Call get-wallet Edge Function
    ↓
If not exists, call create-wallet
    ↓
CDP creates server-side wallet
    ↓
Mapping stored: user_address → server_wallet_address
```

### Voting Flow (Custodial)
```
User swipes on proposal
    ↓
handleVote() in SwipeStack
    ↓
submitVote() in useVoting
    ↓
encodeFunctionData(castVote, [proposalId, support])
    ↓
sendTransaction Edge Function
    ↓
CDP signs with server wallet
    ↓
Transaction submitted to blockchain
    ↓
Hash returned instantly
    ↓
Vote stored in Supabase
```

## Security Considerations

### ⚠️ You Hold the Keys
- You control the CDP Server Wallets
- Users trust you to vote as they intend
- This is custodial - you have custody responsibility

### Best Practices
1. **Transparency**: Users should know votes are custodial
2. **Audit Trail**: All votes logged in Supabase
3. **Key Security**: Never commit CDP credentials to git
4. **Monitoring**: Watch Edge Function logs for errors
5. **Rate Limiting**: Consider adding rate limits to Edge Functions

## Database Schema

The `server_wallets` table stores the mapping:
```sql
user_address TEXT UNIQUE          -- User's connected wallet
server_wallet_address TEXT        -- CDP wallet you control
server_wallet_id TEXT UNIQUE      -- CDP wallet ID
wallet_data JSONB                 -- Empty (CDP manages server-side)
network_id TEXT                   -- 'base-mainnet'
```

## Troubleshooting

### Edge Function Fails
Check Supabase logs:
```bash
supabase functions logs send-transaction --tail
```

Common issues:
- Missing CDP credentials
- Wrong network ID (should be 'base-mainnet')
- Server wallet not created for user

### Transaction Fails
Check browser console for:
```
[useServerWallet] Error sending transaction: ...
```

Possible causes:
- Proposal already voted on
- Invalid proposal ID
- Contract reverted

### No Server Wallet Created
Check console:
```
[useServerWallet] Error creating wallet: ...
```

Verify:
- CDP credentials are correct
- Edge Function is deployed
- Database migration ran successfully

## Rollback Plan

If you need to revert to Smart Wallet + batch voting:

1. Change `useVoting` back to use `useSponsoredTransaction`
2. Re-add batch voting UI in SwipeStack
3. Users will see wallet confirmations again

The Edge Functions will still exist but won't be called.

## Next Steps

1. **Test thoroughly** with small votes before production
2. **Monitor Edge Function costs** (CDP charges per transaction)
3. **Add user consent flow** ("By voting, you authorize us to sign on your behalf")
4. **Set up alerts** for Edge Function failures
5. **Consider insurance** or security audits for production

## Questions?

Check the Edge Function code:
- `supabase/functions/create-wallet/index.ts`
- `supabase/functions/send-transaction/index.ts`
- `supabase/functions/get-wallet/index.ts`

Review the hook:
- `src/hooks/useServerWallet.ts`
- `src/hooks/useVoting.ts`

The architecture is solid - your colleague built it well! 🚀
