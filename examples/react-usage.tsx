/**
 * Example: Using ActionCodesWalletAdapter with @solana/wallet-adapter-react
 *
 * Install peer dependencies:
 *   npm install @solana/wallet-adapter-base @solana/wallet-adapter-react \
 *               @solana/wallet-adapter-react-ui @solana/web3.js \
 *               @anthropic-test/wallet-adapter-actioncodes
 */

import React, { FC, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { ActionCodesWalletAdapter } from '@anthropic-test/wallet-adapter-actioncodes';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles for the wallet adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

const ENDPOINT = clusterApiUrl('devnet');

const App: FC = () => {
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new ActionCodesWalletAdapter({
            authToken: 'YOUR_AUTH_TOKEN_HERE',
            connection: ENDPOINT,
            environment: 'devnet', // 'mainnet' | 'devnet' | 'local'
            theme: 'auto',        // 'auto' | 'light' | 'dark'
            debug: true,
        }),
    ], []);

    return (
        <ConnectionProvider endpoint={ENDPOINT}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div style={{ padding: 20 }}>
                        <h1>My Solana dApp</h1>
                        <WalletMultiButton />
                        {/* Clicking "Action Codes" in the wallet list opens the Action Code modal */}
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;
