# Network Configuration for Server Wallets

## Overview

Server wallets can be created on different networks (testnet or mainnet). By default, wallets are created on **Base Sepolia testnet** for local development.

## Configuration

### Environment Variable

Set the `CDP_NETWORK_ID` environment variable to control which network wallets are created on:

**For Local Development (Testnet)**:
```bash
# In .env or .env.local (or leave unset - defaults to testnet)
CDP_NETWORK_ID=base-sepolia
```

**For Production (Mainnet)**:
```bash
# Set as Supabase secret
supabase secrets set CDP_NETWORK_ID=base-mainnet
```

### Supported Networks

- `base-sepolia` - Base Sepolia testnet (default, recommended for development)
- `base-mainnet` - Base mainnet (for production)

## How It Works

### Wallet Creation

When `create-wallet` Edge Function is called:

1. Reads `CDP_NETWORK_ID` from environment (defaults to `base-sepolia`)
2. Creates wallet on the specified network
3. Stores `network_id` in database

```typescript
// In create-wallet Edge Function
const networkId = Deno.env.get('CDP_NETWORK_ID') || 'base-sepolia'

const wallet = await Wallet.create({
  networkId: networkId, // Uses environment variable or defaults to testnet
})
```

### Transaction Sending

When `send-transaction` Edge Function is called:

1. Retrieves wallet from database (includes `network_id`)
2. Uses the stored `network_id` for the transaction
3. Ensures transaction is sent on the correct network

```typescript
// In send-transaction Edge Function
const transfer = await wallet.send({
  to,
  amount,
  currency,
  networkId: walletRecord.network_id, // Uses network from database
})
```

## Local Development Setup

### Default Behavior (Testnet)

**No configuration needed** - wallets are created on Base Sepolia testnet by default:

```bash
# .env file (CDP_NETWORK_ID not set)
VITE_CDP_API_KEY=your-testnet-key
VITE_CDP_API_SECRET=your-testnet-secret
# CDP_NETWORK_ID defaults to 'base-sepolia'
```

### Explicit Testnet Configuration

If you want to be explicit:

```bash
# .env file
CDP_NETWORK_ID=base-sepolia
```

### Testing with Testnet

1. **Get Testnet ETH**: Use a Base Sepolia faucet to fund your server wallets
2. **Test Transactions**: All transactions will be on testnet
3. **No Real Value**: Testnet ETH has no real value

## Production Setup

### Switch to Mainnet

**Important**: Only switch to mainnet when ready for production!

```bash
# Set as Supabase secret
supabase secrets set CDP_NETWORK_ID=base-mainnet
```

### Migration Considerations

If you have existing wallets on testnet and want to switch to mainnet:

1. **New wallets** will be created on mainnet
2. **Existing wallets** remain on their original network
3. **Consider**: You may want separate wallets for testnet and mainnet per user

### Production Checklist

- [ ] `CDP_NETWORK_ID` set to `base-mainnet`
- [ ] CDP API keys are production keys (not test keys)
- [ ] Server wallets funded with real ETH (if needed)
- [ ] Tested wallet creation and transactions
- [ ] Monitoring set up for mainnet transactions

## Network-Specific Features

### Base Sepolia (Testnet)
- ✅ Free testnet ETH from faucets
- ✅ No real value at risk
- ✅ Fast block times
- ✅ Perfect for development and testing

### Base Mainnet
- ⚠️ Requires real ETH
- ⚠️ Real value transactions
- ✅ Production-ready
- ✅ Real user transactions

## Troubleshooting

### Wrong Network Error

**Error**: "Transaction failed: wrong network"

**Solution**: 
- Check `CDP_NETWORK_ID` is set correctly
- Verify wallet was created on the correct network
- Check database `network_id` field matches your configuration

### Testnet vs Mainnet Confusion

**Problem**: Wallets created on testnet but trying to use on mainnet

**Solution**:
- Check `server_wallets` table: `SELECT network_id FROM server_wallets`
- Ensure `CDP_NETWORK_ID` matches your intended network
- Consider separate wallets for testnet/mainnet per user

### Network Mismatch

**Problem**: Wallet created on one network, transaction attempted on another

**Solution**:
- The `send-transaction` function uses the network from the database
- Wallets are tied to their creation network
- Create new wallets if you need to switch networks

## Best Practices

1. **Local Development**: Always use testnet (`base-sepolia`)
2. **Production**: Use mainnet (`base-mainnet`)
3. **Environment Separation**: Use different CDP API keys for testnet vs mainnet
4. **Network Verification**: Check `network_id` in database before transactions
5. **Testing**: Test wallet creation and transactions on testnet before production

## Summary

- ✅ **Default**: Wallets created on Base Sepolia testnet (no config needed)
- ✅ **Configurable**: Set `CDP_NETWORK_ID` environment variable
- ✅ **Local Dev**: Use testnet (default or explicit `base-sepolia`)
- ✅ **Production**: Set `CDP_NETWORK_ID=base-mainnet` as secret
- ✅ **Automatic**: Transactions use the network from wallet's `network_id`

Your wallets are already configured for testnet by default - perfect for local development! 🎉


