// Augments monaco global types with Kusto api. Should be imported if you're using amd modules, or if you've set `MonacoEnvironment.globalApi` to true.

/// <reference types="monaco-editor/monaco" />

declare namespace monaco.editor {
    export interface ICodeEditor {
        getCurrentCommandRange(cursorPosition: monaco.Position): monaco.Range;
    }
}

declare namespace monaco.languages {
    export const kusto: typeof import('@kusto/monaco-kusto');
}
