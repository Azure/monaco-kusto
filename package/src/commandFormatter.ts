import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export default class KustoCommandFormatter {
    private actionAdded: boolean = false;

    constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
        // selection also represents no selection - for example the event gets triggered when moving cursor from point
        // a to point b. in the case start position will equal end position.
        editor.onDidChangeCursorSelection((changeEvent) => {
            if (this.editor.getModel().getLanguageId() !== 'kusto') {
                return;
            }
            // Theoretically you would expect this code to run only once in onDidCreateEditor.
            // Turns out that onDidCreateEditor is fired before the IStandaloneEditor is completely created (it is emitted by
            // the super ctor before the child ctor was able to fully run).
            // Thus we don't have a key binding provided yet when onDidCreateEditor is run, which is essential to call addAction.
            // By adding the action here in onDidChangeCursorSelection we're making sure that the editor has a key binding provider,
            // and we just need to make sure that this happens only once.
            if (!this.actionAdded) {
                editor.addAction({
                    id: 'editor.action.kusto.formatCurrentCommand',
                    label: 'Format Command Under Cursor',
                    keybindings: [
                        monaco.KeyMod.chord(
                            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF
                        ),
                    ],
                    run: (ed: monaco.editor.IStandaloneCodeEditor) => {
                        editor.trigger('KustoCommandFormatter', 'editor.action.formatSelection', null);
                    },
                    contextMenuGroupId: '1_modification',
                });
                this.actionAdded = true;
            }
        });
    }
}
