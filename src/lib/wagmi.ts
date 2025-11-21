import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

const cdpApiKey = import.meta.env.VITE_CDP_API_KEY || 'a142a893-a9b1-4b3c-bbbd-b609c06dd145';
// Base Sepolia RPC - use public RPC or Coinbase Developer Platform if available
const baseSepoliaRpc = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'DAO Swipe',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
});
