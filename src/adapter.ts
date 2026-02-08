import type { SendTransactionOptions, WalletName } from '@solana/wallet-adapter-base';
import {
    BaseMessageSignerWalletAdapter,
    WalletConnectionError,
    WalletNotConnectedError,
    WalletReadyState,
    WalletSendTransactionError,
    WalletSignMessageError,
    WalletSignTransactionError,
    isVersionedTransaction,
} from '@solana/wallet-adapter-base';
import type { TransactionSignature, TransactionVersion } from '@solana/web3.js';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import ActionCodesClient, { Prod, Dev, Local } from '@actioncodes/sdk';
import type { ActionCodeState } from '@actioncodes/sdk';
import { createModal, destroyModal } from './ui/ActionCodeModal.js';
import type { ActionCodeModal } from './ui/ActionCodeModal.js';
import type { ActionCodesWalletAdapterConfig } from './types.js';
import { uint8ArrayToBase64, base64ToUint8Array } from './utils/base64.js';

export const ActionCodesWalletName = 'Action Codes' as WalletName<'Action Codes'>;

const ICON = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#6366F1"/><text x="32" y="42" font-family="system-ui" font-size="28" font-weight="bold" fill="white" text-anchor="middle">AC</text></svg>')}`;

const AUTO_CLOSE_DELAY_MS = 1500;

export class ActionCodesWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = ActionCodesWalletName;
    url = 'https://actioncodes.org';
    icon = ICON;
    supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(['legacy', 0] as const);

    private _connecting = false;
    private _publicKey: PublicKey | null = null;
    private _readyState: WalletReadyState = WalletReadyState.Loadable;

    private _config: ActionCodesWalletAdapterConfig;
    private _client: ActionCodesClient | null = null;
    private _modal: ActionCodeModal | null = null;
    private _code: string | null = null;
    private _solanaConnection: Connection | null = null;
    private _observerAbort: AbortController | null = null;

    constructor(config: ActionCodesWalletAdapterConfig) {
        super();
        this._config = config;
    }

    get publicKey(): PublicKey | null { return this._publicKey; }
    get connecting(): boolean { return this._connecting; }
    get readyState(): WalletReadyState { return this._readyState; }

    /* ================================================================
     *  SDK CLIENT (lazy init)
     * ================================================================ */

    private _getConnection(): Connection {
        if (this._solanaConnection) return this._solanaConnection;

        const conn = this._config.connection;
        if (typeof conn === 'string') {
            this._solanaConnection = new Connection(conn);
        } else {
            this._solanaConnection = conn;
        }
        return this._solanaConnection!;
    }

    private _resolveRelayTarget(): string {
        if (this._config.relayerUrl) return this._config.relayerUrl;
        switch (this._config.environment) {
            case 'devnet': return Dev;
            case 'local': return Local;
            case 'mainnet':
            default: return Prod;
        }
    }

    private _getClient(): ActionCodesClient {
        if (this._client) return this._client;

        const target = this._resolveRelayTarget();

        this._client = new ActionCodesClient(target, {
            auth: { authorization: `Bearer ${this._config.authToken}` },
            adapters: {
                solana: { connection: this._getConnection() },
            },
        });

        return this._client;
    }

    private _log(...args: unknown[]) {
        if (this._config.debug) {
            console.log('[ActionCodesAdapter]', ...args);
        }
    }

    /* ================================================================
     *  CONNECT
     * ================================================================ */

    async connect(): Promise<void> {
        if (this.connected || this._connecting) return;

        this._connecting = true;
        this._log('connect: opening modal');

        try {
            const theme = this._config.theme ?? 'auto';
            this._modal = createModal(theme);

            const code = await this._waitForCodeInput();

            this._modal.setState('resolving');
            this._log('connect: resolving code', code);

            const client = this._getClient();
            const resolved = await client.relay.resolve('solana', code);

            this._code = code;
            this._publicKey = new PublicKey(resolved.pubkey);

            this._log('connect: resolved pubkey', resolved.pubkey);

            // Close modal after connect — it will reopen for signing
            destroyModal(this._modal);
            this._modal = null;

            this.emit('connect', this._publicKey);
        } catch (err: any) {
            this._log('connect: error', err);

            // Show error in modal briefly then close
            if (this._modal) {
                this._modal.setState('error', undefined, err?.message ?? 'Failed to resolve code');
                await this._delay(AUTO_CLOSE_DELAY_MS);
                destroyModal(this._modal);
                this._modal = null;
            }

            this._cleanup();
            throw new WalletConnectionError(err?.message, err);
        } finally {
            this._connecting = false;
        }
    }

    /* ================================================================
     *  DISCONNECT
     * ================================================================ */

    async disconnect(): Promise<void> {
        this._log('disconnect');
        this._abortObserver();

        if (this._modal) {
            destroyModal(this._modal);
            this._modal = null;
        }

        this._cleanup();
        this.emit('disconnect');
    }

    /* ================================================================
     *  SIGN MESSAGE
     * ================================================================ */

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        const publicKey = this._publicKey;
        const code = this._code;
        if (!publicKey || !code) throw new WalletNotConnectedError();

        this._log('signMessage: starting');

        const theme = this._config.theme ?? 'auto';
        this._modal = createModal(theme);
        this._modal.setState('approve', 'Approve in wallet\u2026');

        try {
            const client = this._getClient();
            const messageStr = new TextDecoder().decode(message);

            await client.relay.consume({
                code,
                chain: 'solana',
                payload: {
                    mode: 'sign-only-message',
                    message: messageStr,
                },
            });

            this._log('signMessage: consume done, observing');

            const result = await this._observeUntilFinalized(code, 'finalized-message');

            if (result.type !== 'finalized-message') {
                throw new Error('Unexpected result state: ' + result.type);
            }

            this._log('signMessage: finalized');
            this._modal.setState('success', 'Message signed!');
            await this._delay(AUTO_CLOSE_DELAY_MS);

            // Decode the signed message (base64 → Uint8Array)
            const signature = base64ToUint8Array(result.signedMessage);

            return signature;
        } catch (err: any) {
            this._log('signMessage: error', err);
            if (this._modal) {
                this._modal.setState('error', undefined, err?.message ?? 'Signing failed');
                await this._delay(AUTO_CLOSE_DELAY_MS);
            }
            throw new WalletSignMessageError(err?.message, err);
        } finally {
            destroyModal(this._modal);
            this._modal = null;
            // Action codes are one-time-use: auto-disconnect after signing
            this._autoDisconnect();
        }
    }

    /* ================================================================
     *  SIGN TRANSACTION
     * ================================================================ */

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        const publicKey = this._publicKey;
        const code = this._code;
        if (!publicKey || !code) throw new WalletNotConnectedError();

        this._log('signTransaction: starting');

        const theme = this._config.theme ?? 'auto';
        this._modal = createModal(theme);
        this._modal.setState('approve', 'Approve in wallet\u2026');

        try {
            const client = this._getClient();
            const txBase64 = this._serializeTransaction(transaction);

            await client.relay.consume({
                code,
                chain: 'solana',
                payload: {
                    mode: 'sign-only-transaction',
                    transaction: txBase64,
                },
            });

            this._log('signTransaction: consume done, observing');

            const result = await this._observeUntilFinalized(code, 'finalized-transaction');

            if (result.type !== 'finalized-transaction') {
                throw new Error('Unexpected result state: ' + result.type);
            }

            this._log('signTransaction: finalized');
            this._modal.setState('success', 'Transaction signed!');
            await this._delay(AUTO_CLOSE_DELAY_MS);

            // Deserialize the signed transaction back to the same type
            const signedTx = this._deserializeTransaction(result.signedTransaction, transaction);
            return signedTx;
        } catch (err: any) {
            this._log('signTransaction: error', err);
            if (this._modal) {
                this._modal.setState('error', undefined, err?.message ?? 'Signing failed');
                await this._delay(AUTO_CLOSE_DELAY_MS);
            }
            throw new WalletSignTransactionError(err?.message, err);
        } finally {
            destroyModal(this._modal);
            this._modal = null;
            this._autoDisconnect();
        }
    }

    /* ================================================================
     *  SEND TRANSACTION (sign + execute)
     * ================================================================ */

    async sendTransaction<T extends Transaction | VersionedTransaction>(
        transaction: T,
        connection: Connection,
        options: SendTransactionOptions = {},
    ): Promise<TransactionSignature> {
        const publicKey = this._publicKey;
        const code = this._code;
        if (!publicKey || !code) throw new WalletNotConnectedError();

        this._log('sendTransaction: starting');

        const theme = this._config.theme ?? 'auto';
        this._modal = createModal(theme);
        this._modal.setState('approve', 'Approve in wallet\u2026');

        try {
            // Apply signers if any (wallet-adapter convention)
            const { signers, ...sendOptions } = options;
            if (isVersionedTransaction(transaction)) {
                if (signers?.length) {
                    transaction.sign(signers);
                }
            } else {
                // Legacy transaction: set feePayer and recentBlockhash
                (transaction as Transaction).feePayer = (transaction as Transaction).feePayer || publicKey;
                (transaction as Transaction).recentBlockhash =
                    (transaction as Transaction).recentBlockhash ||
                    (await connection.getLatestBlockhash({
                        commitment: sendOptions.preflightCommitment,
                        minContextSlot: sendOptions.minContextSlot,
                    })).blockhash;
                if (signers?.length) {
                    (transaction as Transaction).partialSign(...signers);
                }
            }

            const client = this._getClient();
            const txBase64 = this._serializeTransaction(transaction);

            await client.relay.consume({
                code,
                chain: 'solana',
                payload: {
                    mode: 'sign-and-execute-transaction',
                    transaction: txBase64,
                },
            });

            this._log('sendTransaction: consume done, observing');

            const result = await this._observeUntilFinalized(code, 'finalized-execution');

            if (result.type !== 'finalized-execution') {
                throw new Error('Unexpected result state: ' + result.type);
            }

            this._log('sendTransaction: finalized, txHash:', result.txHash);
            this._modal.setState('success', 'Transaction confirmed!');
            await this._delay(AUTO_CLOSE_DELAY_MS);

            return result.txHash;
        } catch (err: any) {
            this._log('sendTransaction: error', err);
            if (this._modal) {
                this._modal.setState('error', undefined, err?.message ?? 'Transaction failed');
                await this._delay(AUTO_CLOSE_DELAY_MS);
            }
            throw new WalletSendTransactionError(err?.message, err);
        } finally {
            destroyModal(this._modal);
            this._modal = null;
            this._autoDisconnect();
        }
    }

    /* ================================================================
     *  INTERNALS
     * ================================================================ */

    /**
     * Open the modal and wait for the user to submit a code or cancel.
     * Returns the submitted code string, or throws on cancel.
     */
    private _waitForCodeInput(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const modal = this._modal!;

            const onSubmit = (e: Event) => {
                cleanup();
                resolve((e as CustomEvent).detail.code);
            };

            const onCancel = () => {
                cleanup();
                reject(new WalletConnectionError('User cancelled'));
            };

            const cleanup = () => {
                modal.removeEventListener('actioncode:submit', onSubmit);
                modal.removeEventListener('actioncode:cancel', onCancel);
            };

            modal.addEventListener('actioncode:submit', onSubmit);
            modal.addEventListener('actioncode:cancel', onCancel);
        });
    }

    /**
     * Observe the code via the SDK until we hit a finalized state.
     * Resolves with the final ActionCodeState.
     */
    private async _observeUntilFinalized(
        code: string,
        expectedType: string,
    ): Promise<ActionCodeState> {
        const client = this._getClient();
        this._observerAbort = new AbortController();
        const signal = this._observerAbort.signal;

        try {
            for await (const state of client.relay.observe('solana', code)) {
                this._log('observe: state', state.type);

                if (signal.aborted) {
                    throw new Error('Observation aborted');
                }

                // Update modal when the wallet-side picks up the payload
                if (state.type === 'sign-message' || state.type === 'sign-transaction' || state.type === 'execute-transaction') {
                    this._modal?.setState('approve', 'Approve in wallet\u2026');
                }

                // Check for finalized states
                if (state.type.startsWith('finalized-')) {
                    return state;
                }
            }

            throw new Error('Observer ended without finalized state');
        } finally {
            this._observerAbort = null;
        }
    }

    /** Serialize a Transaction or VersionedTransaction to base64 */
    private _serializeTransaction(transaction: Transaction | VersionedTransaction): string {
        let bytes: Uint8Array;
        if (isVersionedTransaction(transaction)) {
            bytes = transaction.serialize();
        } else {
            bytes = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
        }
        return uint8ArrayToBase64(bytes);
    }

    /** Deserialize a base64 transaction back to the original type */
    private _deserializeTransaction<T extends Transaction | VersionedTransaction>(
        base64Tx: string,
        original: T,
    ): T {
        const bytes = base64ToUint8Array(base64Tx);
        if (isVersionedTransaction(original)) {
            return VersionedTransaction.deserialize(bytes) as T;
        }
        return Transaction.from(bytes) as T;
    }

    /** Cleanup internal state (called on disconnect and error) */
    private _cleanup() {
        this._publicKey = null;
        this._code = null;
        this._connecting = false;
    }

    /** Cancel any running observer */
    private _abortObserver() {
        if (this._observerAbort) {
            this._observerAbort.abort();
            this._observerAbort = null;
        }
    }

    /** Auto-disconnect after a one-time signing operation */
    private _autoDisconnect() {
        this._log('auto-disconnect: code consumed');
        this._code = null;
        this._publicKey = null;
        this.emit('disconnect');
    }

    /** Simple delay helper */
    private _delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
