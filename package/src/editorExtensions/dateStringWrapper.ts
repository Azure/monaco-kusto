import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export function dateStringWrapper(editor: monaco.editor.ICodeEditor) {
    editor.onDidPaste((event) => {
        const { range } = event;
        if (!range) return;

        const model = editor.getModel();
        const pasted = model.getValueInRange(range);
        if (!isBareIsoDate(pasted)) return;

        const wrapped = `datetime(${pasted})`;

        const edit: monaco.editor.IIdentifiedSingleEditOperation = {
            range,
            text: wrapped,
            forceMoveMarkers: true,
        };

        const cursorStateComputer: monaco.editor.ICursorStateComputer = () => {
            const startOffset = model.getOffsetAt(range.getStartPosition());
            const endPos = model.getPositionAt(startOffset + wrapped.length);

            return [new monaco.Selection(endPos.lineNumber, endPos.column, endPos.lineNumber, endPos.column)];
        };

        editor.executeEdits('paste-date', [edit], cursorStateComputer);
    });
}

export function isBareIsoDate(text: string): boolean {
    const s = text.trim();
    return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(s);
}
