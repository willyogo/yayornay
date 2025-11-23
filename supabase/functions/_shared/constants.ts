/**
 * Shared constants for Edge Functions
 * Network configuration for CDP SDK
 */

// Chain ID to CDP Network Name mapping
export const CDP_NETWORKS = {
  // Base Mainnet (Chain ID: 8453)
  BASE_MAINNET: 'base',
  // Base Sepolia Testnet (Chain ID: 84532)
  BASE_SEPOLIA: 'base-sepolia',
} as const

// Chain ID constants
export const CHAIN_IDS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const

/**
 * Get CDP network name from chain ID
 * @param chainId - Chain ID (e.g., 8453 for Base Mainnet, 84532 for Base Sepolia)
 * @returns CDP network name (e.g., 'base' or 'base-sepolia')
 */
export function getCdpNetworkFromChainId(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.BASE_MAINNET:
      return CDP_NETWORKS.BASE_MAINNET
    case CHAIN_IDS.BASE_SEPOLIA:
      return CDP_NETWORKS.BASE_SEPOLIA
    default:
      // Default to testnet for safety
      return CDP_NETWORKS.BASE_SEPOLIA
  }
}

/**
 * Detect if we're running in development (local) or production
 * @returns true if in development, false if in production
 */
function isDevelopment(): boolean {
  // Check for explicit environment variable (highest priority)
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV')
  if (env === 'development' || env === 'dev') {
    console.log('[constants] Detected development via ENVIRONMENT/NODE_ENV:', env)
    return true
  }
  if (env === 'production' || env === 'prod') {
    console.log('[constants] Detected production via ENVIRONMENT/NODE_ENV:', env)
    return false
  }
  
  // Check Supabase URL - local dev uses localhost
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
  if (supabaseUrl) {
    // Local development typically uses localhost or 127.0.0.1
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      console.log('[constants] Detected development via Supabase URL (localhost):', supabaseUrl)
      return true
    }
    // Production uses supabase.co domain
    if (supabaseUrl.includes('supabase.co')) {
      console.log('[constants] Detected production via Supabase URL (supabase.co):', supabaseUrl)
      return false
    }
    console.log('[constants] Unknown Supabase URL format, defaulting to production:', supabaseUrl)
  } else {
    console.log('[constants] No Supabase URL found, defaulting to production')
  }
  
  // Default to production for safety
  return false
}

/**
 * Get CDP network name from environment variable or auto-detect based on environment
 * Checks CDP_NETWORK_ID env var first, then auto-detects dev/prod, then chain ID if provided
 * 
 * Priority:
 * 1. CDP_NETWORK_ID environment variable (highest priority - explicit override)
 * 2. Auto-detect: Sepolia for development, Mainnet for production
 * 3. Chain ID mapping if provided
 * 4. Default to BASE_MAINNET for production (safety fallback)
 * 
 * @param chainId - Optional chain ID to determine network
 * @returns CDP network name
 */
export function getCdpNetwork(chainId?: number): string {
  // Check environment variable first (allows explicit override)
  const envNetwork = Deno.env.get('CDP_NETWORK_ID')
  if (envNetwork) {
    console.log('[constants] Using CDP_NETWORK_ID from environment:', envNetwork)
    return envNetwork
  }
  
  // Auto-detect: Use Sepolia for development, Mainnet for production
  const isDev = isDevelopment()
  const detectedNetwork = isDev ? CDP_NETWORKS.BASE_SEPOLIA : CDP_NETWORKS.BASE_MAINNET
  console.log('[constants] Auto-detected network:', detectedNetwork, '(isDev:', isDev, ')')
  
  if (isDev) {
    return CDP_NETWORKS.BASE_SEPOLIA
  }
  
  // If chain ID provided, use it to determine network
  if (chainId !== undefined) {
    const chainNetwork = getCdpNetworkFromChainId(chainId)
    console.log('[constants] Using chain ID', chainId, '-> network:', chainNetwork)
    return chainNetwork
  }
  
  // Default to mainnet for production (safety fallback)
  console.log('[constants] Using default production network:', CDP_NETWORKS.BASE_MAINNET)
  return CDP_NETWORKS.BASE_MAINNET
}

