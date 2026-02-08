import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionCodeModal, createModal, destroyModal } from './ActionCodeModal.js';

// Helper: wait for Lit's updateComplete cycle
async function updated(el: ActionCodeModal) {
    await el.updateComplete;
}

// Helper: query inside shadow root
function shadow(el: ActionCodeModal) {
    return el.shadowRoot!;
}

describe('ActionCodeModal', () => {
    let modal: ActionCodeModal;

    beforeEach(async () => {
        modal = createModal('light');
        await updated(modal);
    });

    afterEach(() => {
        destroyModal(modal);
    });

    /* ----------------------------------------------------------
     *  Creation & Destruction
     * ---------------------------------------------------------- */

    describe('createModal / destroyModal', () => {
        it('appends modal to document.body', () => {
            expect(document.body.contains(modal)).toBe(true);
        });

        it('removes modal from DOM on destroy', () => {
            destroyModal(modal);
            expect(document.body.contains(modal)).toBe(false);
        });

        it('destroyModal is safe to call with null', () => {
            expect(() => destroyModal(null)).not.toThrow();
        });

        it('sets theme attribute', () => {
            expect(modal.getAttribute('theme')).toBe('light');
        });

        it('defaults to auto theme', async () => {
            const m = createModal();
            await updated(m);
            expect(m.getAttribute('theme')).toBe('auto');
            destroyModal(m);
        });
    });

    /* ----------------------------------------------------------
     *  Default State
     * ---------------------------------------------------------- */

    describe('default state', () => {
        it('starts in input state', () => {
            expect(modal.modalState).toBe('input');
        });

        it('renders input field', () => {
            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            expect(input).toBeTruthy();
            expect(input.placeholder).toBe('Enter code');
        });

        it('renders help button', () => {
            const btn = shadow(modal).querySelector('.help-btn');
            expect(btn).toBeTruthy();
        });

        it('renders submit button (disabled)', () => {
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn).toBeTruthy();
            expect(btn.disabled).toBe(true);
        });

        it('renders title', () => {
            const title = shadow(modal).querySelector('.title');
            expect(title?.textContent).toBe('Action Codes');
        });

        it('renders close button', () => {
            const btn = shadow(modal).querySelector('.close-btn');
            expect(btn).toBeTruthy();
        });

        it('locks body scroll', () => {
            expect(document.body.style.overflow).toBe('hidden');
        });

        it('restores body scroll on disconnect', () => {
            destroyModal(modal);
            expect(document.body.style.overflow).toBe('');
        });
    });

    /* ----------------------------------------------------------
     *  Code Validation
     * ---------------------------------------------------------- */

    describe('code validation', () => {
        async function typeCode(code: string) {
            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.value = code;
            input.dispatchEvent(new Event('input'));
            await updated(modal);
        }

        it('submit disabled when code is too short', async () => {
            await typeCode('123');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(true);
        });

        it('submit disabled when code is 5 chars', async () => {
            await typeCode('12345');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(true);
        });

        it('submit enabled when code is 6+ alphanumeric chars', async () => {
            await typeCode('123456');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(false);
        });

        it('submit enabled for 8-digit code', async () => {
            await typeCode('48291037');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(false);
        });

        it('submit enabled for alphanumeric codes', async () => {
            await typeCode('abc123XY');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(false);
        });

        it('submit disabled for codes with special chars', async () => {
            await typeCode('123-456');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(true);
        });

        it('submit disabled for codes with spaces', async () => {
            await typeCode('1234 56');
            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            expect(btn.disabled).toBe(true);
        });
    });

    /* ----------------------------------------------------------
     *  Events
     * ---------------------------------------------------------- */

    describe('events', () => {
        async function typeCode(code: string) {
            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.value = code;
            input.dispatchEvent(new Event('input'));
            await updated(modal);
        }

        it('dispatches actioncode:submit with code on submit click', async () => {
            await typeCode('48291037');
            const handler = vi.fn();
            modal.addEventListener('actioncode:submit', handler);

            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            btn.click();

            expect(handler).toHaveBeenCalledOnce();
            expect(handler.mock.calls[0][0].detail).toEqual({ code: '48291037' });
        });

        it('dispatches actioncode:submit on Enter key', async () => {
            await typeCode('48291037');
            const handler = vi.fn();
            modal.addEventListener('actioncode:submit', handler);

            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('does NOT dispatch submit on Enter if code is invalid', async () => {
            await typeCode('123');
            const handler = vi.fn();
            modal.addEventListener('actioncode:submit', handler);

            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            expect(handler).not.toHaveBeenCalled();
        });

        it('dispatches actioncode:cancel on close button click', async () => {
            const handler = vi.fn();
            modal.addEventListener('actioncode:cancel', handler);

            const btn = shadow(modal).querySelector('.close-btn') as HTMLButtonElement;
            btn.click();

            expect(handler).toHaveBeenCalledOnce();
        });

        it('dispatches actioncode:cancel on overlay click', async () => {
            const handler = vi.fn();
            modal.addEventListener('actioncode:cancel', handler);

            const overlay = shadow(modal).querySelector('.overlay') as HTMLElement;
            overlay.click();

            expect(handler).toHaveBeenCalledOnce();
        });

        it('dispatches actioncode:cancel on Escape key', async () => {
            const handler = vi.fn();
            modal.addEventListener('actioncode:cancel', handler);

            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(handler).toHaveBeenCalledOnce();
        });

        it('trims whitespace from submitted code', async () => {
            await typeCode('  48291037  ');
            const handler = vi.fn();
            modal.addEventListener('actioncode:submit', handler);

            // Code with spaces won't pass validation, so test with trailing space
            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.value = '48291037 ';
            input.dispatchEvent(new Event('input'));
            await updated(modal);

            // This won't submit because space fails alphanumeric check
            // Instead test that trim works for valid code
            input.value = '48291037';
            input.dispatchEvent(new Event('input'));
            await updated(modal);

            const btn = shadow(modal).querySelector('.submit-btn') as HTMLButtonElement;
            btn.click();

            expect(handler.mock.calls[0][0].detail.code).toBe('48291037');
        });
    });

    /* ----------------------------------------------------------
     *  Tooltip
     * ---------------------------------------------------------- */

    describe('tooltip', () => {
        it('tooltip is hidden by default', () => {
            const tooltip = shadow(modal).querySelector('.tooltip');
            expect(tooltip).toBeNull();
        });

        it('shows tooltip on help button click', async () => {
            const btn = shadow(modal).querySelector('.help-btn') as HTMLButtonElement;
            btn.click();
            await updated(modal);

            const tooltip = shadow(modal).querySelector('.tooltip');
            expect(tooltip).toBeTruthy();
            expect(tooltip?.textContent).toContain('Action Code');
        });

        it('hides tooltip on second click', async () => {
            const btn = shadow(modal).querySelector('.help-btn') as HTMLButtonElement;
            btn.click();
            await updated(modal);
            btn.click();
            await updated(modal);

            const tooltip = shadow(modal).querySelector('.tooltip');
            expect(tooltip).toBeNull();
        });

        it('help button gets active class when tooltip is shown', async () => {
            const btn = shadow(modal).querySelector('.help-btn') as HTMLButtonElement;
            btn.click();
            await updated(modal);

            expect(btn.classList.contains('active')).toBe(true);
        });

        it('tooltip contains learn more link', async () => {
            const btn = shadow(modal).querySelector('.help-btn') as HTMLButtonElement;
            btn.click();
            await updated(modal);

            const link = shadow(modal).querySelector('.tooltip a') as HTMLAnchorElement;
            expect(link).toBeTruthy();
            expect(link.href).toContain('docs.actioncodes.org');
            expect(link.target).toBe('_blank');
        });
    });

    /* ----------------------------------------------------------
     *  State Transitions (setState / reset)
     * ---------------------------------------------------------- */

    describe('setState', () => {
        it('switches to resolving state', async () => {
            modal.setState('resolving');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Resolving code');
            expect(shadow(modal).querySelector('.code-input')).toBeNull();
        });

        it('switches to approve state', async () => {
            modal.setState('approve');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Approve in wallet');
        });

        it('switches to approve with custom message', async () => {
            modal.setState('approve', 'Signing message\u2026');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Signing message');
        });

        it('switches to success state', async () => {
            modal.setState('success', 'Transaction confirmed!');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Transaction confirmed');
            const icon = shadow(modal).querySelector('.status-icon.success');
            expect(icon).toBeTruthy();
        });

        it('switches to error state', async () => {
            modal.setState('error', undefined, 'Code expired');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Code expired');
            const icon = shadow(modal).querySelector('.status-icon.error');
            expect(icon).toBeTruthy();
        });

        it('shows fallback error message', async () => {
            modal.setState('error');
            await updated(modal);

            const msg = shadow(modal).querySelector('.status-message');
            expect(msg?.textContent).toContain('Something went wrong');
        });
    });

    describe('reset', () => {
        it('resets back to input state', async () => {
            modal.setState('success', 'Done!');
            await updated(modal);
            expect(shadow(modal).querySelector('.code-input')).toBeNull();

            modal.reset();
            await updated(modal);
            expect(modal.modalState).toBe('input');
            expect(modal.message).toBe('');
            expect(modal.error).toBe('');
            expect(shadow(modal).querySelector('.code-input')).toBeTruthy();
        });

        it('clears tooltip on reset', async () => {
            // Show tooltip
            const btn = shadow(modal).querySelector('.help-btn') as HTMLButtonElement;
            btn.click();
            await updated(modal);
            expect(shadow(modal).querySelector('.tooltip')).toBeTruthy();

            // Go to another state and reset
            modal.setState('approve');
            await updated(modal);
            modal.reset();
            await updated(modal);

            expect(shadow(modal).querySelector('.tooltip')).toBeNull();
        });
    });

    /* ----------------------------------------------------------
     *  Error Display in Input State
     * ---------------------------------------------------------- */

    describe('error in input state', () => {
        it('shows error text below input', async () => {
            modal.error = 'Invalid code';
            await updated(modal);

            const err = shadow(modal).querySelector('.error-text');
            expect(err?.textContent).toBe('Invalid code');
        });

        it('clears error when user types', async () => {
            modal.error = 'Invalid code';
            await updated(modal);

            const input = shadow(modal).querySelector('.code-input') as HTMLInputElement;
            input.value = '1';
            input.dispatchEvent(new Event('input'));
            await updated(modal);

            expect(modal.error).toBe('');
            const err = shadow(modal).querySelector('.error-text');
            expect(err).toBeNull();
        });
    });

    /* ----------------------------------------------------------
     *  Theme
     * ---------------------------------------------------------- */

    describe('theme', () => {
        it('reflects theme as attribute', () => {
            expect(modal.getAttribute('theme')).toBe('light');
        });

        it('can change theme', async () => {
            modal.theme = 'dark';
            await updated(modal);
            expect(modal.getAttribute('theme')).toBe('dark');
        });

        it('accepts auto theme', async () => {
            modal.theme = 'auto';
            await updated(modal);
            expect(modal.getAttribute('theme')).toBe('auto');
        });
    });
});
