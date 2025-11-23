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
} as const;
