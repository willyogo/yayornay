import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

const cdpApiKey = import.meta.env.VITE_CDP_API_KEY || 'a142a893-a9b1-4b3c-bbbd-b609c06dd145';

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'DAO Swipe',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(`https://api.developer.coinbase.com/rpc/v1/base/${cdpApiKey}`),
  },
});
