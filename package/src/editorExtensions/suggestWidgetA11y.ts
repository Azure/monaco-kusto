/**
 * Accessibility patch for Monaco's suggest widget "Read more" button.
 *
 * The "Read more" button in Monaco's built-in suggest widget is not keyboard
 * accessible by default:
 *   - It is hidden unless the mouse hovers over a suggestion row.
 *   - It has tabIndex=-1 so keyboard users cannot Tab to it.
 *   - It lacks a proper aria-label for screen readers.
 *
 * This patch uses a MutationObserver to detect when the button appears in the
 * DOM and fixes it in place. Fixes MAS 2.1.1 / WCAG SC 2.1.1 (Keyboard).
 *
 * @param editor - The Monaco editor instance to patch.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

const READ_MORE_SELECTOR = '.suggest-widget .suggest-readMore';
const READ_MORE_ARIA_LABEL = 'Read more documentation';

export function patchSuggestWidgetA11y(editor: monaco.editor.ICodeEditor): void {
    const editorDom = editor.getDomNode();
    if (!editorDom) {
        return;
    }

    const patchButton = (btn: HTMLElement): void => {
        // Make it reachable via Tab key
        if (btn.getAttribute('tabindex') !== '0') {
            btn.setAttribute('tabindex', '0');
        }
        // Ensure screen readers announce it as a button
        if (!btn.getAttribute('role')) {
            btn.setAttribute('role', 'button');
        }
        // Provide a descriptive label
        if (!btn.getAttribute('aria-label')) {
            btn.setAttribute('aria-label', READ_MORE_ARIA_LABEL);
        }
        // Allow activation via Enter or Space for keyboard users
        if (!btn.dataset.a11yPatched) {
            btn.dataset.a11yPatched = 'true';
            btn.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        }
    };

    // Patch any already-existing buttons (e.g. if editor was created before this runs)
    editorDom.querySelectorAll<HTMLElement>(READ_MORE_SELECTOR).forEach(patchButton);

    // Watch for future DOM additions (suggest widget is created lazily)
    const observer = new MutationObserver((mutations) => {
        const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
        if (!hasAddedNodes) {
            return;
        }
        editorDom.querySelectorAll<HTMLElement>(
            `${READ_MORE_SELECTOR}:not([data-a11y-patched])`
        ).forEach(patchButton);
    });

    observer.observe(editorDom, { childList: true, subtree: true });

    // Clean up observer when the editor is disposed
    editor.onDidDispose(() => observer.disconnect());
}
