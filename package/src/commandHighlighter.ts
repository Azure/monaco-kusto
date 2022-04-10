/**
 * Highlights the command that surround cursor location
 */
export default class KustoCommandHighlighter implements monaco.editor.IEditorContribution {
    private static readonly ID = 'editor.contrib.kustoCommandHighliter';
    private static CURRENT_COMMAND_HIGHLIGHT: monaco.editor.IModelDecorationOptions = {
        className: 'selectionHighlight',
    };

    private disposables: monaco.IDisposable[] = [];
    private decorations: string[] = [];

    /**
     * Register to cursor movement and seleciton events.
     * @param editor monaco editor instance
     */
    constructor(private editor: monaco.editor.ICodeEditor) {
        // Note that selection update is triggered not only for selection changes, but also just when no text selection is occuring and cursor just moves around.
        // This case is counted as a 0-length selection starting and ending on the cursor position.
        this.editor.onDidChangeCursorSelection((changeEvent) => {
            if (this.editor.getModel().getLanguageId() !== 'kusto') {
                return;
            }

            this.highlightCommandUnderCursor(changeEvent);
        });
    }

    getId(): string {
        return KustoCommandHighlighter.ID;
    }
    dispose(): void {
        this.disposables.forEach((d) => d.dispose());
    }

    private highlightCommandUnderCursor(changeEvent: monaco.editor.ICursorSelectionChangedEvent): void {
        // Looks like the user selected a bunch of text. we don't want to highlight the entire command in this case - since highlighting
        // the text is more helpful.
        if (!changeEvent.selection.isEmpty()) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
            return;
        }

        const commandRange: monaco.Range = this.editor.getCurrentCommandRange(changeEvent.selection.getStartPosition());
        const decorations: monaco.editor.IModelDeltaDecoration[] = [
            {
                range: commandRange,
                options: KustoCommandHighlighter.CURRENT_COMMAND_HIGHLIGHT,
            },
        ];

        this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
    }
}
