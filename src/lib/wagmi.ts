import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { CHAIN_CONFIG } from '../config/constants';

const cdpApiKey = import.meta.env.VITE_CDP_API_KEY || 'a142a893-a9b1-4b3c-bbbd-b609c06dd145';
// Base mainnet RPC - use public RPC or Coinbase Developer Platform if available
const baseRpc = import.meta.env.VITE_BASE_RPC_URL || CHAIN_CONFIG.RPC_URL;

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'YAYNAY',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(baseRpc),
  },
});
