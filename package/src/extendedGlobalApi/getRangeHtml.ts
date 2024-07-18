import { editor, IRange } from 'monaco-editor/esm/vs/editor/editor.api';

export function getRangeHtml(model: editor.IModel, range: IRange): string {
    const { startLineNumber, endLineNumber, endColumn } = range;
    const isLastLineEmpty = endColumn === 0;
    const actualLastLine = isLastLineEmpty ? endLineNumber - 1 : endLineNumber;
    const totalLines = actualLastLine - startLineNumber + 1;

    const colorizedLines = new Array(totalLines)
        .fill(undefined)
        .map((_, index) => editor.colorizeModelLine(model, startLineNumber + index));

    return colorizedLines.join('<br/>');
}
