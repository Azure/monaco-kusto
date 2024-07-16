import { editor } from 'monaco-editor/esm/vs/editor/editor.api';

export function getRangeHtml(model: editor.IModel, lineStart: number, lineEnd: number): string {
    const totalLines = lineEnd - lineStart + 1;

    const lines = new Array(totalLines);
    for (let lineNumber = lineStart, index = 0; lineNumber <= lineEnd; lineNumber++, index++) {
        lines[index] = editor.colorizeModelLine(model, lineNumber);
    }

    return lines.join('<br/>');
}
