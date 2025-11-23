/**
 * Application-wide constants
 * Centralized configuration for contracts, chain IDs, and network settings
 */

// Chain Configuration
export const CHAIN_CONFIG = {
  ID: 8453, // Base Mainnet
  NAME: 'base',
  DISPLAY_NAME: 'Base',
  RPC_URL: 'https://mainnet.base.org',
  BLOCK_EXPLORER_URL: 'https://basescan.org',
} as const;

// CDP Network Names (for Coinbase Developer Platform SDK)
export const CDP_NETWORKS = {
  BASE_MAINNET: 'base',
  BASE_SEPOLIA: 'base-sepolia',
} as const;

/**
 * Get CDP network name from chain ID
 * @param chainId - Chain ID (e.g., 8453 for Base Mainnet, 84532 for Base Sepolia)
 * @returns CDP network name (e.g., 'base' or 'base-sepolia')
 */
export function getCdpNetworkFromChainId(chainId: number): string {
  switch (chainId) {
    case 8453: // Base Mainnet
      return CDP_NETWORKS.BASE_MAINNET;
    case 84532: // Base Sepolia
      return CDP_NETWORKS.BASE_SEPOLIA;
    default:
      // Default to mainnet for production
      return CDP_NETWORKS.BASE_MAINNET;
  }
}

/**
 * Get CDP network name based on current environment
 * Auto-detects development vs production and uses appropriate network
 * 
 * Priority:
 * 1. VITE_CDP_NETWORK_ID environment variable (explicit override)
 * 2. Auto-detect: Sepolia for development, Mainnet for production
 * 3. Determine from CHAIN_CONFIG (fallback)
 * 
 * @returns CDP network name
 */
export function getCdpNetwork(): string {
  // Check environment variable first (allows explicit override)
  const envNetwork = import.meta.env.VITE_CDP_NETWORK_ID;
  if (envNetwork) {
    return envNetwork;
  }
  
  // Auto-detect: Use Sepolia for development, Mainnet for production
  // Vite provides import.meta.env.DEV and import.meta.env.PROD
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return CDP_NETWORKS.BASE_SEPOLIA;
  }
  
  // Determine from chain config (defaults to mainnet for production)
  return getCdpNetworkFromChainId(CHAIN_CONFIG.ID);
}

// Builder DAO contracts on Base Mainnet
export const CONTRACTS = {
  NFT: '0xbfBadc73C07f96f77Fd23d86912912409fa144D8',
  AUCTION_HOUSE: '0x3c9E2523533FA9F9a8C5E0B556bFf0AFb80BD67e',
  GOVERNOR: '0xB94478A133D25Bd1A67545a9F9E6fcc5e5fa9146',
  TREASURY: '0x8AfC86f5b9DdEcD5b938b6F45b2a22Ba0A37427a',
  METADATA: '0x12ea773A31DB9bAC636748D4A7A373434BcbF4b6',
} as const;

// DAO address (token contract) used for subgraph filtering
export const DAO_ADDRESS = CONTRACTS.NFT;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  CHAIN: CHAIN_CONFIG,
  CONTRACTS,
  DAO_ADDRESS,
  CDP_NETWORKS,
} as const;
