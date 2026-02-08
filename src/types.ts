import type { Connection } from '@solana/web3.js';

export type ActionCodesEnvironment = 'mainnet' | 'devnet' | 'local';

export interface ActionCodesWalletAdapterConfig {
    /** API auth token for the Action Codes relay (required) */
    authToken: string;
    /** Solana RPC connection or endpoint URL (required for protocol meta attachment) */
    connection: Connection | string;
    /** Relay environment — "mainnet" (default), "devnet", or "local" */
    environment?: ActionCodesEnvironment;
    /** Custom relay URL — overrides `environment` if set */
    relayerUrl?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Modal theme — defaults to "auto" (follows prefers-color-scheme) */
    theme?: 'auto' | 'light' | 'dark';
}

export type ModalState = 'input' | 'resolving' | 'approve' | 'success' | 'error';
