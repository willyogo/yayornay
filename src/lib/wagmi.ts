import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

// Base mainnet RPC - use public RPC or Coinbase Developer Platform if available
const baseRpc = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';

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
