# Base Paymaster Implementation Guide - YAYNAY

This document explains the Base Paymaster implementation for gasless voting transactions in the YAYNAY application.

## ✅ What's Been Implemented

The Base Paymaster has been fully integrated into your wagmi app to enable **gasless voting transactions**. Users with Coinbase Smart Wallets can now vote on proposals without needing ETH for gas fees.

## 🏗️ Architecture Overview

### Files Modified

1. **`.env.example`** - Added paymaster configuration variables
2. **`src/lib/wagmi.ts`** - Configured to use Paymaster & Bundler endpoint
3. **`src/hooks/useSponsoredTransaction.ts`** - Refactored to use wagmi experimental hooks
4. **`src/main.tsx`** - Already configured with OnchainKitProvider (no changes needed)
5. **`src/hooks/useVoting.ts`** - Already uses `useSponsoredTransaction` (no changes needed)

### How It Works

```
User clicks vote → useVoting.submitVote() → useSponsoredTransaction.execute()
                                              ↓
                                    useCapabilities checks for paymaster support
                                              ↓
                                    useWriteContracts with paymaster capabilities
                                              ↓
                                    Transaction sponsored by Base Paymaster
                                              ↓
                                    Vote recorded on-chain (gasless for user!)
```

## 🔧 Configuration Required

### Step 1: Get Your Paymaster & Bundler Endpoint

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create or select your project
3. Navigate to **Paymaster** from the left sidebar
4. Go to the **Configuration** tab
5. Select **Base Mainnet** (or **Base Sepolia** for testing)
6. Copy the **Paymaster & Bundler endpoint** (RPC URL)
   - Format: `https://api.developer.coinbase.com/rpc/v1/base/<YOUR-KEY>`

### Step 2: Configure Contract Allowlist

In the CDP Dashboard under Paymaster Configuration:

1. Click **Add** in the Contract allowlist section
2. Add your Governor contract: `0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e`
3. Give it a name: "YAYNAY Governor"
4. Add the allowed function: `castVote(bytes32,uint8)`
5. Click **Save**

### Step 3: Set Spending Limits

Configure limits to control costs:

**Per User Limits:**
- Set max USD per user (e.g., `$0.10`)
- Set max UserOperations per user (e.g., `10`)
- Choose limit cycle: Daily, Weekly, or Monthly

**Global Limits:**
- Set total budget (e.g., `$50.00` for testing, `$1000+` for production)
- This is shared across all users

### Step 4: Update Your .env File

Create or update your `.env` file with the following:

```bash
# Coinbase Developer Platform API Key
VITE_CDP_API_KEY=your-cdp-api-key-here

# Base Paymaster & Bundler Endpoint
VITE_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/your-key-here

# Your existing variables
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ZORA_API_KEY=your-zora-api-key
```

⚠️ **Security Note:** For production, use a [proxy service](https://www.smartwallet.dev/guides/paymasters) to hide your paymaster URL instead of exposing it in the client.

## 🧪 Testing the Implementation

### Test on Base Sepolia First

1. In CDP Dashboard, select **Base Sepolia**
2. Configure the same contract allowlist
3. Set generous limits (unlimited on testnet)
4. Update your `.env` with the Sepolia paymaster URL
5. Test voting transactions

### Verify Paymaster is Working

Check your browser console for these logs:

```
[Wagmi] Using RPC: Paymaster Bundler ✅
[OnchainKit] Paymaster URL: configured ✅
[Paymaster] Executing sponsored transaction: {...}
[Paymaster] Transaction submitted with ID: 0x...
[Paymaster] Transaction confirmed: 0x...
```

### Common Issues

**Issue: "No paymaster capabilities detected"**
- Solution: Ensure user is connected with Coinbase Smart Wallet
- Check that `VITE_PAYMASTER_URL` is set correctly
- Verify paymaster is enabled in CDP Dashboard

**Issue: "request denied - rejected due to max limit reached"**
- Solution: Increase per-user or global limits in CDP Dashboard
- Wait for limit cycle to reset (daily/weekly/monthly)

**Issue: Transaction requires gas**
- Solution: Verify contract address is allowlisted in CDP
- Check that `castVote` function is added to allowlist
- Ensure paymaster is enabled (toggle in CDP)

## 📊 Monitoring Usage

### CDP Dashboard

View your paymaster usage:
1. Go to [Paymaster Tool](https://portal.cdp.coinbase.com/products/bundler-and-paymaster)
2. Check the **Usage** tab
3. Monitor:
   - Total sponsored transactions
   - Gas costs covered
   - Per-user statistics

### Application Logs

The implementation logs all paymaster activity:

```typescript
console.log('[Paymaster] Executing sponsored transaction:', {...})
console.log('[Paymaster] Transaction submitted with ID:', id)
console.log('[Paymaster] Transaction confirmed:', hash)
```

## 🔐 Production Checklist

- [ ] Paymaster URL set in `.env`
- [ ] Governor contract allowlisted in CDP
- [ ] `castVote` function allowlisted
- [ ] Spending limits configured appropriately
- [ ] Tested on Base Sepolia
- [ ] Proxy service set up for paymaster URL (recommended)
- [ ] Monitoring dashboard set up
- [ ] User notifications for gasless transactions (optional)

## 💡 How the Code Works

### useSponsoredTransaction Hook

```typescript
// 1. Check if wallet supports paymaster
const { data: availableCapabilities } = useCapabilities({ account: userAddress });

// 2. Configure paymaster if supported
const capabilities = useMemo(() => {
  if (capabilitiesForChain?.['paymasterService']?.supported) {
    return {
      paymasterService: {
        url: import.meta.env.VITE_PAYMASTER_URL,
      },
    };
  }
  return {};
}, [availableCapabilities, userAddress]);

// 3. Execute transaction with paymaster
const { writeContractsAsync } = useWriteContracts();
await writeContractsAsync({
  contracts: [{ address, abi, functionName, args }],
  capabilities, // ← This enables paymaster sponsorship
});
```

### useVoting Hook

```typescript
// Voting automatically uses paymaster through useSponsoredTransaction
const submitVote = async (proposalId: string, voteType: VoteType) => {
  const support = voteTypeToSupport(voteType);
  
  // This transaction is automatically sponsored if paymaster is configured
  await sponsoredTx.execute({
    address: CONTRACTS.GOVERNOR,
    abi: GovernorABI,
    functionName: 'castVote',
    args: [proposalIdBytes32, BigInt(support)],
  });
};
```

## 🎯 Key Benefits

1. **Better UX**: Users don't need ETH to vote
2. **Higher Engagement**: Removes gas fee friction
3. **Smart Wallet Native**: Works seamlessly with Coinbase Smart Wallets
4. **Cost Control**: Set spending limits and cycles
5. **Transparency**: Monitor all sponsored transactions in CDP Dashboard

## 📚 Additional Resources

- [Base Paymaster Documentation](https://docs.cdp.coinbase.com/paymaster)
- [Wagmi Experimental Hooks](https://wagmi.sh/react/api/hooks/useWriteContracts)
- [OnchainKit Documentation](https://onchainkit.xyz)
- [Smart Wallet Guides](https://www.smartwallet.dev/guides/paymasters)

## 🆘 Support

If you encounter issues:
1. Check CDP Dashboard for paymaster status
2. Review browser console logs
3. Verify contract allowlist configuration
4. Join [Coinbase Developer Discord](https://discord.com/invite/cdp)

---

**Your paymaster is ready! Just add your credentials to `.env` and start testing gasless votes! 🎉**
