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
export default class CaseInvertor {
    private actionsRegistered = false;

    constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor.onDidChangeCursorSelection(() => {
            if (this.editor.getModel()?.getLanguageId() !== 'kusto') {
                return;
            }

            if (!this.actionsRegistered) {
                this.registerUpperCaseHandler();
                this.registerLowerCaseHandler();
                this.actionsRegistered = true;
            }
        });
    }

    private registerUpperCaseHandler() {
        this.editor.addAction({
            id: 'kusto.toUpperCase',
            label: 'To Upper Case',
            keybindings: [monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyU],
            run: (editor) => {
                const selectedRange = editor.getSelection();
                const selectedText = editor.getModel().getValueInRange(selectedRange);
                const upperCaseText = selectedText.toUpperCase();
                editor.executeEdits('toUpperCase', [
                    {
                        range: selectedRange,
                        text: upperCaseText,
                    },
                ]);
            },
        });
    }

    private registerLowerCaseHandler() {
        this.editor.addAction({
            id: 'kusto.toLowerCase',
            label: 'To Lower Case',
            keybindings: [monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyL],
            run: (editor) => {
                const selectedRange = editor.getSelection();
                const selectedText = editor.getModel().getValueInRange(selectedRange);
                const lowerCaseText = selectedText.toLowerCase();
                editor.executeEdits('toLowerCase', [
                    {
                        range: selectedRange,
                        text: lowerCaseText,
                    },
                ]);
            },
        });
    }
}
