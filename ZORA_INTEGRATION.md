# Zora Coins SDK Integration

## Setup Complete! 🎉

Your app now fetches real creator coin data from Zora. Here's what was implemented:

### Files Created/Updated

1. **`src/lib/zora.ts`** - Zora Coins SDK wrapper with utility functions
2. **`src/hooks/useZoraCoin.ts`** - React hook to fetch coin data
3. **`src/components/ProposalCard.tsx`** - Updated to display real Zora data
4. **`.env.example`** - Environment variables template

### Features Implemented

✅ **Real Coin Data**
- Market cap
- 24h trading volume
- 24h price change percentage
- Unique holder count

✅ **Creator Profile Information**
- Display name / handle
- Profile picture (avatar)
- Cover images from coin media
- Bio (available in the data)

✅ **Smart Fallbacks**
- Shows loading spinner while fetching
- Falls back to mock data if no coin found
- Falls back to generated avatars if no profile image
- Handles blocked coins/profiles automatically

### Next Steps

#### 1. Get a Zora API Key

1. Go to https://zora.co/settings/developer
2. Create an API key
3. Create a `.env` file (copy from `.env.example`)
4. Add your API key:
   ```
   VITE_ZORA_API_KEY=your-actual-api-key-here
   ```

#### 2. Test with Real Data

The integration will automatically:
- Fetch coin data when a proposal card is displayed
- Show real market data if the creator has a coin
- Fall back to mock data if no coin exists

#### 3. Update Your Proposals

Make sure your proposals in the database have either:
- `creator_username` (e.g., "@empresstrash")
- `creator_address` (wallet address)

The hook will try to find the creator's coin using either identifier.

### How It Works

```typescript
// 1. Hook fetches creator's coin address from their profile
const coinAddress = await getCreatorCoinAddress("@empresstrash");

// 2. Then fetches detailed coin data
const coinData = await fetchCoinData(coinAddress);

// 3. Component displays the data with smart fallbacks
```

### Data Flow

```
ProposalCard
    ↓
useZoraCoin Hook
    ↓
getCreatorCoinAddress (fetch profile → get coin address)
    ↓
fetchCoinData (get full coin details)
    ↓
Display in UI with formatCurrency & calculate24hChange
```

### Available Coin Data

The `ZoraCoinData` type includes:
- `address` - Coin contract address
- `name`, `symbol` - Coin identification
- `marketCap`, `volume24h` - Market metrics
- `uniqueHolders` - Holder count
- `creatorProfile` - Profile info including avatar, display name, bio, social accounts
- `mediaContent` - Coin images/media
- `tokenPrice` - Price information

### Utility Functions

**`formatCurrency(value)`** - Formats numbers as currency
- $1,234,567 → $1.2M
- $12,345 → $12.3K
- $123 → $123.00

**`calculate24hChange(marketCap, delta)`** - Calculates percentage change
- Returns positive/negative percentage

### Error Handling

The integration handles:
- No API key (works without, but may hit rate limits)
- Creator has no coin (shows mock data)
- Blocked coins/profiles (automatically filtered)
- Network errors (shows mock data)
- Invalid addresses (shows mock data)

### Performance

- Data is cached per component instance
- Only fetches when creator identifier changes
- Cleanup on unmount prevents memory leaks
- Non-blocking with loading states

Enjoy your Zora-powered swipe cards! 🚀
