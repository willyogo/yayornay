/**
 * Application-wide constants
 * Centralized configuration for contracts, chain IDs, and network settings
 */

// Chain Configuration
export const CHAIN_CONFIG = {
  ID: 84532, // Base Sepolia testnet
  NAME: 'base-sepolia',
  DISPLAY_NAME: 'Base Sepolia',
  RPC_URL: 'https://sepolia.base.org',
  BLOCK_EXPLORER_URL: 'https://sepolia.basescan.org',
} as const;

// Builder DAO testnet contracts on Base Sepolia
export const CONTRACTS = {
  NFT: '0x626FbB71Ca4FE65F94e73AB842148505ae1a0B26',
  AUCTION_HOUSE: '0xe9609Fb710bDC6f88Aa5992014a156aeb31A6896',
  GOVERNOR: '0x9F530c7bCdb859bB1DcA3cD4EAE644f973A5f505',
  TREASURY: '0x3ed26c1d23Fd4Ea3B5e2077B60B4F1EC80Aba94f',
  METADATA: '0x82ACd8e6ea567d99B63fcFc21ec824b5D05C9744',
} as const;

// Legacy DAO address (from app.ts)
export const DAO_ADDRESS = '0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17' as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  CHAIN: CHAIN_CONFIG,
  CONTRACTS,
  DAO_ADDRESS,
} as const;

