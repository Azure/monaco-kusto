import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface SuggestController extends monaco.editor.IEditorContribution {
    cancelSuggestWidget(): void;
}

/**
 * Registers a Kusto-specific action to close the IntelliSense suggestions popup.
 *
 * Note:
 * We register the action on the first cursor movement, not on editor creation,
 * because Monaco fires 'onDidCreateEditor' before the keybinding service is fully initialized.
 * Waiting for a cursor event guarantees that the editor is fully ready
 * and allows safe registration of actions with keybindings.
 */
export default class KustoIntelliSenseCloser {
    private actionRegistered = false;

    constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor.onDidChangeCursorSelection(() => {
            if (this.editor.getModel()?.getLanguageId() !== 'kusto') {
                return;
            }

            if (!this.actionRegistered) {
                this.registerAction();
                this.actionRegistered = true;
            }
        });
    }

    private registerAction() {
        this.editor.addAction({
            id: 'kusto.closeIntelliSense',
            label: 'Close IntelliSense',
            keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Enter],
            run: (editor) => closeIntelliSense(editor),
            contextMenuGroupId: '1_modification',
        });
    }
}

export function closeIntelliSense(editor: monaco.editor.IStandaloneCodeEditor) {
    const controller = editor.getContribution<SuggestController>('editor.contrib.suggestController');
    controller?.cancelSuggestWidget();
}
