import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { CHAIN_CONFIG } from '../config/constants';

const cdpApiKey = import.meta.env.VITE_CDP_API_KEY || 'a142a893-a9b1-4b3c-bbbd-b609c06dd145';
// Base Sepolia RPC - use public RPC or Coinbase Developer Platform if available
const baseSepoliaRpc = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || CHAIN_CONFIG.RPC_URL;

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'YAYNAY',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
});
