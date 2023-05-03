// Augments monaco global types with Kusto api. Should be imported if you're
// using amd modules, or if you've set `MonacoEnvironment.globalApi` to true.

/// <reference types="monaco-editor/monaco" />

declare namespace monaco.editor {
    export interface ICodeEditor {
        getCurrentCommandRange(cursorPosition: monaco.Position): monaco.Range;
    }
}

// No easy way to declare a namespace that matches an existing module right
// now
// https://github.com/microsoft/TypeScript/issues/10187

// Export everything but the types
declare namespace monaco.languages {
    export const kusto: typeof import('@kusto/monaco-kusto');
}

// Types must be manually re-exported right now :(
declare namespace monaco.languages.kusto {
    export type LanguageSettings = import('@kusto/monaco-kusto').LanguageSettings;
    export type SyntaxErrorAsMarkDownOptions = import('@kusto/monaco-kusto').SyntaxErrorAsMarkDownOptions;
    export type QuickFixCodeActionOptions = import('@kusto/monaco-kusto').QuickFixCodeActionOptions;
    export type FormatterOptions = import('@kusto/monaco-kusto').FormatterOptions;
    export type FormatterPlacementStyle = import('@kusto/monaco-kusto').FormatterPlacementStyle;
    export type LanguageServiceDefaults = import('@kusto/monaco-kusto').LanguageServiceDefaults;
    export type KustoWorker = import('@kusto/monaco-kusto').KustoWorker;
    export type WorkerAccessor = import('@kusto/monaco-kusto').WorkerAccessor;
    export type Column = import('@kusto/monaco-kusto').Column;
    export type Table = import('@kusto/monaco-kusto').Table;
    export type ScalarParameter = import('@kusto/monaco-kusto').ScalarParameter;
    export type TabularParameter = import('@kusto/monaco-kusto').TabularParameter;
    export type InputParameter = import('@kusto/monaco-kusto').InputParameter;
    export type Function = import('@kusto/monaco-kusto').Function;
    export type Database = import('@kusto/monaco-kusto').Database;
    export type EngineSchema = import('@kusto/monaco-kusto').EngineSchema;
    export type ClusterMangerSchema = import('@kusto/monaco-kusto').ClusterMangerSchema;
    export type DataManagementSchema = import('@kusto/monaco-kusto').DataManagementSchema;
    export type Schema = import('@kusto/monaco-kusto').Schema;
    export type VisualizationType = import('@kusto/monaco-kusto').VisualizationType;
    export type Scale = import('@kusto/monaco-kusto').Scale;
    export type LegendVisibility = import('@kusto/monaco-kusto').LegendVisibility;
    export type YSplit = import('@kusto/monaco-kusto').YSplit;
    export type Kind = import('@kusto/monaco-kusto').Kind;
    export type RenderOptions = import('@kusto/monaco-kusto').RenderOptions;
    export type RenderInfo = import('@kusto/monaco-kusto').RenderInfo;
    export type DatabaseReference = import('@kusto/monaco-kusto').DatabaseReference;
    export type ClusterReference = import('@kusto/monaco-kusto').ClusterReference;
    export type OnDidProvideCompletionItems = import('@kusto/monaco-kusto').OnDidProvideCompletionItems;
}
