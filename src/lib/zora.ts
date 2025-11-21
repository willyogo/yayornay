import { setApiKey, getCoin, getProfile } from '@zoralabs/coins-sdk';

// Set your Zora API key
// Get one from: https://zora.co/settings/developer
const ZORA_API_KEY = import.meta.env.VITE_ZORA_API_KEY;

if (ZORA_API_KEY) {
  setApiKey(ZORA_API_KEY);
}

export interface ZoraCoinData {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  marketCap: string;
  volume24h: string;
  marketCapDelta24h?: string;
  totalSupply: string;
  uniqueHolders: number;
  tokenPrice?: {
    usdcPrice?: string;
  };
  creatorProfile?: {
    handle?: string;
    displayName?: string;
    bio?: string;
    avatar?: {
      medium?: string;
      small?: string;
    };
    socialAccounts?: {
      farcaster?: {
        username?: string;
      };
      twitter?: {
        username?: string;
      };
    };
  };
  mediaContent?: {
    previewImage?: {
      medium?: string;
      small?: string;
    };
  };
}

/**
 * Fetch coin data by contract address
 */
export async function fetchCoinData(
  address: string,
  chain: number = 8453 // Base mainnet
): Promise<ZoraCoinData | null> {
  try {
    console.log('🪙 [fetchCoinData] Fetching coin for address:', address, 'chain:', chain);
    const response = await getCoin({ address, chain });
    
    console.log('🪙 [fetchCoinData] Raw response:', response);
    
    if (!response.data?.zora20Token) {
      console.warn('⚠️ [fetchCoinData] No zora20Token in response');
      return null;
    }

    const coin = response.data.zora20Token;

    // Skip blocked coins
    if (coin.platformBlocked || coin.creatorProfile?.platformBlocked) {
      console.warn('⚠️ [fetchCoinData] Coin or creator is blocked');
      return null;
    }

    const coinData = {
      address: coin.address || address,
      name: coin.name || '',
      symbol: coin.symbol || '',
      description: coin.description || '',
      marketCap: coin.marketCap || '0',
      volume24h: coin.volume24h || '0',
      marketCapDelta24h: coin.marketCapDelta24h || '0',
      totalSupply: coin.totalSupply || '0',
      uniqueHolders: coin.uniqueHolders || 0,
      tokenPrice: coin.tokenPrice,
      creatorProfile: coin.creatorProfile,
      mediaContent: coin.mediaContent,
    };

    console.log('✅ [fetchCoinData] Coin data extracted:', {
      name: coinData.name,
      hasCreatorProfile: !!coinData.creatorProfile,
      avatarPath: coinData.creatorProfile?.avatar?.medium,
      mediaPath: coinData.mediaContent?.previewImage?.medium
    });

    return coinData;
  } catch (error) {
    console.error('❌ [fetchCoinData] Error:', error);
    return null;
  }
}

/**
 * Fetch profile data by wallet address or handle
 */
export async function fetchProfileData(identifier: string) {
  try {
    // Remove @ symbol if present - Zora API doesn't need it
    const cleanIdentifier = identifier.startsWith('@') ? identifier.slice(1) : identifier;
    
    console.log('👤 [fetchProfileData] Fetching profile for:', cleanIdentifier, '(original:', identifier, ')');
    const response = await getProfile({ identifier: cleanIdentifier });
    
    console.log('👤 [fetchProfileData] Raw response:', response);
    
    if (!response.data?.profile) {
      console.warn('⚠️ [fetchProfileData] No profile found in response');
      return null;
    }

    const profile = response.data.profile;

    // Skip blocked profiles
    if (profile.platformBlocked) {
      console.warn('⚠️ [fetchProfileData] Profile is blocked:', identifier);
      return null;
    }

    console.log('✅ [fetchProfileData] Profile found:', {
      handle: profile.handle,
      hasCoin: !!profile.creatorCoin,
      coinAddress: profile.creatorCoin?.address
    });

    return profile;
  } catch (error) {
    console.error('❌ [fetchProfileData] Error:', error);
    return null;
  }
}

/**
 * Get creator coin address from a profile
 */
export async function getCreatorCoinAddress(identifier: string): Promise<string | null> {
  const profile = await fetchProfileData(identifier);
  return profile?.creatorCoin?.address || null;
}

/**
 * Format currency values for display
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0';
  
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  
  return `$${num.toFixed(2)}`;
}

/**
 * Calculate 24h change percentage
 */
export function calculate24hChange(marketCap: string, delta24h?: string): number {
  if (!delta24h) return 0;
  
  const cap = parseFloat(marketCap);
  const delta = parseFloat(delta24h);
  
  if (isNaN(cap) || isNaN(delta) || cap === 0) return 0;
  
  return (delta / (cap - delta)) * 100;
}
