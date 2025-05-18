export function dateStringWrapper(editor: monaco.editor.ICodeEditor) {
    editor.onDidPaste(async (event) => {
        const pastedTextRange = event.range;
        if (!pastedTextRange) {
            return;
        }
        const model = editor.getModel();
        const pastedTextString = model.getValueInRange(pastedTextRange);
        if (isBareUtcDate(pastedTextString)) {
            const selection = editor.getSelection();
            const startPos = selection?.getStartPosition();
            if (model && startPos) {
                const editOperation = {
                    range: pastedTextRange,
                    text: `datetime(${pastedTextString})`,
                    forceMoveMarkers: true,
                };
                model.pushStackElement();
                editor.executeEdits('paste-date', [editOperation], []);
                model.pushStackElement();
            }
        }
    });
}

function isBareUtcDate(text: string): boolean {
    const s = text.trim();
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s);
}
