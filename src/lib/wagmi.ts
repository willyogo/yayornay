import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { CHAIN_CONFIG } from '../config/constants';

// Use the Paymaster & Bundler endpoint as the RPC if available
// This enables gasless transactions via Base Paymaster
const paymasterUrl = import.meta.env.VITE_PAYMASTER_URL;
const baseRpc = paymasterUrl || import.meta.env.VITE_BASE_RPC_URL || CHAIN_CONFIG.RPC_URL;

console.log('[Wagmi] Using RPC:', baseRpc.includes('developer.coinbase.com') ? 'Paymaster Bundler ✅' : 'Standard RPC');

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
