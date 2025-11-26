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
  NFT: '0x3740fea2a46ca4414b4afde16264389642e6596a',
  AUCTION_HOUSE: '0x14227ed5dd596e3a63773933ba68014ed3cfb7e5',
  GOVERNOR: '0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e',
  TREASURY: '0x72b052a9a830001ce202ad907e6eedd0b86c4a88',
  METADATA: '0x47887fc1e456531765ecad1ae20b762f59ae6cf9',
} as const;    

// DAO address (token contract) used for subgraph filtering
export const DAO_ADDRESS = CONTRACTS.NFT;

// Address of the AI agent allowed to submit proposals
export const AI_AGENT_ADDRESS = '0x84c78b7c8e321b939534a929d9bf17a0a654518f';

// Export all constants as a single object for convenience
export const CONSTANTS = {
  CHAIN: CHAIN_CONFIG,
  CONTRACTS,
  DAO_ADDRESS,
  AI_AGENT_ADDRESS,
  CDP_NETWORKS,
} as const;
