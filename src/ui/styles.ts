import { css } from 'lit';

export const modalStyles = css`
    :host {
        /* Light theme defaults */
        --ac-bg: #ffffff;
        --ac-bg-input: #f4f4f5;
        --ac-text: #18181b;
        --ac-text-secondary: #71717a;
        --ac-border: #e4e4e7;
        --ac-accent: #6366f1;
        --ac-accent-hover: #4f46e5;
        --ac-error: #ef4444;
        --ac-success: #22c55e;
        --ac-overlay: rgba(0, 0, 0, 0.5);
        --ac-radius: 12px;
        --ac-radius-sm: 8px;
        --ac-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--ac-font);
    }

    :host([theme="dark"]) {
        --ac-bg: #18181b;
        --ac-bg-input: #27272a;
        --ac-text: #fafafa;
        --ac-text-secondary: #a1a1aa;
        --ac-border: #3f3f46;
        --ac-overlay: rgba(0, 0, 0, 0.7);
    }

    @media (prefers-color-scheme: dark) {
        :host([theme="auto"]) {
            --ac-bg: #18181b;
            --ac-bg-input: #27272a;
            --ac-text: #fafafa;
            --ac-text-secondary: #a1a1aa;
            --ac-border: #3f3f46;
            --ac-overlay: rgba(0, 0, 0, 0.7);
        }
    }

    .overlay {
        position: fixed;
        inset: 0;
        background: var(--ac-overlay);
        animation: fadeIn 150ms ease-out;
    }

    .modal {
        position: relative;
        background: var(--ac-bg);
        border: 1px solid var(--ac-border);
        border-radius: var(--ac-radius);
        padding: 24px;
        width: 380px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        animation: slideUp 200ms ease-out;
        color: var(--ac-text);
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
    }

    .title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ac-text);
        margin: 0;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: var(--ac-text-secondary);
        cursor: pointer;
        border-radius: var(--ac-radius-sm);
        transition: background 150ms, color 150ms;
    }

    .close-btn:hover {
        background: var(--ac-bg-input);
        color: var(--ac-text);
    }

    .input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--ac-bg-input);
        border: 1px solid var(--ac-border);
        border-radius: var(--ac-radius-sm);
        padding: 4px;
        transition: border-color 200ms;
    }

    .input-row:focus-within {
        border-color: var(--ac-accent);
    }

    .help-btn,
    .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 150ms, color 150ms;
    }

    .help-btn {
        background: transparent;
        color: var(--ac-text-secondary);
    }

    .help-btn:hover,
    .help-btn.active {
        color: var(--ac-accent);
    }

    .tooltip {
        font-size: 13px;
        line-height: 1.5;
        color: var(--ac-text-secondary);
        background: var(--ac-bg-input);
        border: 1px solid var(--ac-border);
        border-radius: var(--ac-radius-sm);
        padding: 12px;
        margin-bottom: 12px;
        animation: fadeIn 150ms ease-out;
    }

    .tooltip a {
        color: var(--ac-accent);
        text-decoration: none;
    }

    .tooltip a:hover {
        text-decoration: underline;
    }

    .submit-btn {
        background: var(--ac-accent);
        color: white;
    }

    .submit-btn:hover:not(:disabled) {
        background: var(--ac-accent-hover);
    }

    .submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .code-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        font-family: var(--ac-font);
        color: var(--ac-text);
        padding: 8px 4px;
        letter-spacing: 2px;
    }

    .code-input::placeholder {
        color: var(--ac-text-secondary);
        letter-spacing: normal;
    }

    /* Status view */
    .status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px 0;
        text-align: center;
    }

    .status-icon {
        color: var(--ac-accent);
    }

    .status-icon.success {
        color: var(--ac-success);
    }

    .status-icon.error {
        color: var(--ac-error);
    }

    .status-message {
        font-size: 14px;
        color: var(--ac-text-secondary);
        line-height: 1.5;
    }

    .error-text {
        font-size: 13px;
        color: var(--ac-error);
        margin-top: 8px;
        text-align: center;
    }

    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .spinner {
        animation: spin 1s linear infinite;
    }
`;
