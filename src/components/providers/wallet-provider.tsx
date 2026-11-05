'use client';

import * as React from 'react';
import { createDAppKit } from '@mysten/dapp-kit-core';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const dAppKit = createDAppKit({
  networks: ['mainnet'],
  defaultNetwork: 'mainnet',
  createClient: (network) => new SuiGrpcClient({
    network,
    baseUrl: 'https://fullnode.mainnet.sui.io:443',
  }),
  autoConnect: false,
  storage: null,
  slushWalletConfig: { appName: 'Memeora' },
  storageKey: 'memeora-sui-wallet-mainnet-v1',
});

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
