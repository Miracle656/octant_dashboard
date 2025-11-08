import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import {base, mainnet, polygon, arbitrum} from 'viem/chains';
import './index.css';
import App from './App.tsx';
import {defineChain} from 'viem';

export const octant_fork = defineChain({
  id: 8, // Replace this with your chain's ID
  name: 'OctantV2',
  network: 'octantfork',
  nativeCurrency: {
    decimals: 18, // Replace this with the number of decimals for your chain's native token
    name: 'ubiq',
    symbol: 'UBQ'
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL],
      webSocket: ['wss://virtual.mainnet.eu.rpc.tenderly.co/87bd6871-7026-486c-9db5-2287b66d0c62']
    }
  },
  blockExplorers: {
    default: {name: 'Explorer', url: 'https://dashboard.tenderly.co/explorer/vnet/82c86106-662e-4d7f-a974-c311987358ff/transactions'}
  }
});


createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<PrivyProvider
			appId={import.meta.env.VITE_PRIVY_APP_ID}
			clientId={import.meta.env.VITE_PRIVY_CLIENT_ID}
			config={{
        defaultChain: octant_fork,
        supportedChains: [mainnet, polygon, base, octant_fork, arbitrum],
        appearance: {
          theme: 'dark',
        },
				// Create embedded wallets for users who don't have a wallet
				embeddedWallets: {
					ethereum: {
						createOnLogin: 'users-without-wallets',
					},
				},
			}}
		>
			<App />
		</PrivyProvider>
	</StrictMode>
);
