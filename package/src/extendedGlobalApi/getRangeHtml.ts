import { editor, IRange } from 'monaco-editor/esm/vs/editor/editor.api';

export function getRangeHtml(model: editor.IModel, range: IRange): string {
    const { startLineNumber, endLineNumber, endColumn } = range;
    const isLastLineEmpty = endColumn === 0;
    const actualLastLine = isLastLineEmpty ? endLineNumber - 1 : endLineNumber;
    const totalLines = endLineNumber - actualLastLine + 1;

    const lines = new Array(totalLines);
    for (let lineNumber = startLineNumber, index = 0; lineNumber <= actualLastLine; lineNumber++, index++) {
        lines[index] = editor.colorizeModelLine(model, lineNumber);
    }

    return lines.join('<br/>');
}
