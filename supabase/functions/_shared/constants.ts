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
  // Check for explicit environment variable
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV')
  if (env === 'development' || env === 'dev') {
    return true
  }
  if (env === 'production' || env === 'prod') {
    return false
  }
  
  // Check Supabase URL - local dev uses localhost
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
  if (supabaseUrl) {
    // Local development typically uses localhost or 127.0.0.1
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
      return true
    }
    // Production uses supabase.co domain
    if (supabaseUrl.includes('supabase.co')) {
      return false
    }
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
    return envNetwork
  }
  
  // Auto-detect: Use Sepolia for development, Mainnet for production
  const isDev = isDevelopment()
  if (isDev) {
    return CDP_NETWORKS.BASE_SEPOLIA
  }
  
  // If chain ID provided, use it to determine network
  if (chainId !== undefined) {
    return getCdpNetworkFromChainId(chainId)
  }
  
  // Default to mainnet for production (safety fallback)
  return CDP_NETWORKS.BASE_MAINNET
}

