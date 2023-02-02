/// <reference types="monaco-editor-core/monaco" />

/**
 * Extending ICode editor to contain additional kusto-speicifc methods.
 * note that the extend method needs to be called at least once to take affect, otherwise this here code is useless.
 */
export function extend(editor: monaco.editor.ICodeEditor) {
    const proto = Object.getPrototypeOf(editor);
    proto.getCurrentCommandRange = function(this: monaco.editor.ICodeEditor, cursorPosition: monaco.Position) {
        var editor = this;
        const  zeroBasedCursorLineNumber = cursorPosition.lineNumber - 1;
        const lines = this.getModel().getLinesContent();

        let commandOrdinal = 0;
        const linesWithCommandOrdinal: {commandOrdinal: number, lineNumber: number}[] = [];

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            let isEmptyLine = lines[lineNumber].trim() === '';

            if (isEmptyLine) {
                // increase commandCounter - we'll be starting a new command.
                linesWithCommandOrdinal.push({commandOrdinal: commandOrdinal++, lineNumber}, )
            } else {
                linesWithCommandOrdinal.push({commandOrdinal: commandOrdinal, lineNumber}, )
            }

            // No need to keep scanning if we're past our line and we've seen an empty line.
            if(lineNumber > zeroBasedCursorLineNumber && commandOrdinal > linesWithCommandOrdinal[zeroBasedCursorLineNumber].commandOrdinal ) {
                break;
            }
        }

        const currentCommandOrdinal = linesWithCommandOrdinal[zeroBasedCursorLineNumber].commandOrdinal
        const currentCommandLines = linesWithCommandOrdinal.filter(line => line.commandOrdinal === currentCommandOrdinal );
        const currentCommandStartLine = currentCommandLines[0].lineNumber + 1
        const currentCommandEndLine = currentCommandLines[currentCommandLines.length-1].lineNumber + 1

        // End-column of 1 means no characters will be highlighted - since columns are 1-based in monaco apis.
        // Start-column of 1 and End column of 2 means 1st character is selected.
        // Thus if a line has n column and we need to provide n+1 so that the entire line will be highlighted.
        const commandEndColumn = lines[currentCommandEndLine-1].length + 1
        return new monaco.Range(currentCommandStartLine, 1, currentCommandEndLine  , commandEndColumn)
    }
}