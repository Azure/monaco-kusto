export interface LanguageSettings {
    includeControlCommands?: boolean;
    newlineAfterPipe?: boolean;
    openSuggestionDialogAfterPreviousSuggestionAccepted?: boolean;
    useIntellisenseV2: boolean;
    useSemanticColorization?: boolean;
    useTokenColorization?: boolean;
    disabledCompletionItems?: string[];
    onDidProvideCompletionItems?: monaco.languages.kusto.OnDidProvideCompletionItems;
    enableHover?: boolean;
    formatter?: FormatterOptions;
}

export interface FormatterOptions {
    indentationSize?: number;
    pipeOperatorStyle?: FormatterPlacementStyle;
}

export type FormatterPlacementStyle = 'None' | 'NewLine' | 'Smart';