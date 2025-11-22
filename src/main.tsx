import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';
import { config } from './lib/wagmi';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient();

const cdpApiKey = import.meta.env.VITE_CDP_API_KEY || 'd1da987d-8875-40c1-a79d-e1fd0c5d1b06';
const paymasterUrl = import.meta.env.VITE_PAYMASTER_URL;

console.log('[OnchainKit] CDP API Key:', cdpApiKey ? 'configured ✅' : 'missing ❌');
console.log('[OnchainKit] Paymaster URL:', paymasterUrl || 'not configured ❌');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={cdpApiKey}
          chain={base}
          config={{
            paymaster: paymasterUrl,
          }}
        >
          <App />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
