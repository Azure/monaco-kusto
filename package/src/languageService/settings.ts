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
    syntaxErrorAsMarkDown?: SyntaxErrorAsMarkDownOptions;
    enableQueryWarnings?: boolean;
    enableQuerySuggestions?: boolean;
    disabledDiagnoticCodes?: string[];
    quickFixCodeActions?: QuickFixCodeActionOptions[];
    enableQuickFixes?: boolean;
}

export interface FormatterOptions {
    indentationSize?: number;
    pipeOperatorStyle?: FormatterPlacementStyle;
}

export interface SyntaxErrorAsMarkDownOptions {
    header?: string;
    icon?: string;
    enableSyntaxErrorAsMarkDown?: boolean;
}

export type QuickFixCodeActionOptions = 'Extract Expression' | 'Extract Function' | 'Change to';

export type FormatterPlacementStyle = 'None' | 'NewLine' | 'Smart';
