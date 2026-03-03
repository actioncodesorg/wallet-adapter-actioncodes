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

const ICON =
    'data:image/png;base64,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';


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
